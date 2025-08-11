import express from 'express';
import Joi from 'joi';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const router = express.Router();

// Validation schemas
const analysisSchema = Joi.object({
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid(
    'python', 'javascript', 'java', 'cpp', 'c', 
    'html', 'css', 'typescript'
  ).required(),
  error_message: Joi.string().max(1000).optional(),
  context: Joi.string().max(500).optional(),
  projectFiles: Joi.array().items(Joi.object()).optional()
});

const fixSchema = Joi.object({
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid(
    'python', 'javascript', 'java', 'cpp', 'c', 
    'html', 'css', 'typescript'
  ).required(),
  error_message: Joi.string().min(1).max(1000).required(),
  line_number: Joi.number().integer().min(1).optional(),
  projectFiles: Joi.array().items(Joi.object()).optional()
});

const runSchema = Joi.object({
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid(
    'python', 'javascript', 'java', 'cpp', 'c'
  ).required()
});

// Middleware to validate request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        error_code: 'VALIDATION_ERROR',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.validatedBody = value;
    next();
  };
};

// Middleware to check Gemini service availability
const checkGeminiService = (req, res, next) => {
  if (!req.geminiService) {
    return res.status(503).json({
      success: false,
      error: 'Gemini AI service is not available',
      error_code: 'SERVICE_UNAVAILABLE'
    });
  }
  next();
};

// POST /api/code/analyze - Analyze code for errors and improvements
router.post('/analyze', 
  validateRequest(analysisSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🔍 Analyzing ${req.validatedBody.language} code (${req.validatedBody.code.length} characters)`);

      const result = await req.geminiService.analyzeCode(req.validatedBody);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Analysis completed in ${responseTime}ms. Found ${result.errors.length} errors and ${result.warnings.length} warnings`);

      res.json({
        ...result,
        request_id: `analyze_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Analysis endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during code analysis',
        error_code: 'ANALYSIS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/code/fix - Fix code based on error message
router.post('/fix',
  validateRequest(fixSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🔧 Fixing ${req.validatedBody.language} code error: ${req.validatedBody.error_message.substring(0, 100)}...`);

      const result = await req.geminiService.fixCode(req.validatedBody);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Fix completed in ${responseTime}ms. Applied ${result.fixes_applied.length} fixes with ${result.confidence_score}% confidence`);

      res.json({
        ...result,
        request_id: `fix_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Fix endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during code fixing',
        error_code: 'FIX_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/code/run - Execute code and return output
router.post('/run',
  validateRequest(runSchema),
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🚀 Executing ${req.validatedBody.language} code (${req.validatedBody.code.length} characters)`);

      const { code, language } = req.validatedBody;
      
      // Sanitize and validate code input
      if (!code || typeof code !== 'string' || code.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid code input',
          error_code: 'INVALID_INPUT'
        });
      }
      
      // Check for potentially dangerous patterns in code
      const dangerousPatterns = [
        /import\s+os\s*;?\s*os\.system\s*\(/i,
        /import\s+subprocess\s*;?\s*subprocess\.run\s*\(/i,
        /eval\s*\(/i,
        /exec\s*\(/i,
        /__import__\s*\(/i,
        /process\.exec\s*\(/i,
        /require\s*\(\s*['"]child_process['"]\s*\)/i,
        /spawn\s*\(/i,
        /exec\s*\(/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return res.status(400).json({
            success: false,
            error: 'Code contains potentially dangerous operations that are not allowed',
            error_code: 'DANGEROUS_CODE_DETECTED'
          });
        }
      }
      
      const timestamp = Date.now();
      let tempFile, command, output, error;

      // Create temporary file and execute based on language
      switch (language) {
        case 'python':
          tempFile = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}.py`);
          fs.writeFileSync(tempFile, code);
          command = `python3 "${tempFile}"`;
          break;
        
        case 'javascript':
          tempFile = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}.js`);
          fs.writeFileSync(tempFile, code);
          command = `node "${tempFile}"`;
          break;
        
        case 'java':
          const className = `Code_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
          tempFile = path.join('/tmp', `${className}.java`);
          // Wrap code in a class if it's not already
          const javaCode = code.includes('public class') ? code : 
            `public class ${className} {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
          fs.writeFileSync(tempFile, javaCode);
          command = `cd /tmp && javac "${className}.java" && java "${className}"`;
          break;
        
        case 'cpp':
          tempFile = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}.cpp`);
          fs.writeFileSync(tempFile, code);
          const cppExecutable = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}`);
          command = `cd /tmp && g++ -o "${cppExecutable}" "${tempFile}" && "${cppExecutable}"`;
          break;
        
        case 'c':
          tempFile = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}.c`);
          fs.writeFileSync(tempFile, code);
          const cExecutable = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}`);
          command = `cd /tmp && gcc -o "${cExecutable}" "${tempFile}" && "${cExecutable}"`;
          break;
        
        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported language: ${language}`,
            error_code: 'UNSUPPORTED_LANGUAGE'
          });
      }

      // Execute the code
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 30000, // 30 seconds timeout
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
          cwd: '/tmp' // Restrict working directory
        });
        
        output = stdout;
        error = stderr;
      } catch (execError) {
        if (execError.code === 'ETIMEDOUT') {
          return res.status(408).json({
            success: false,
            error: 'Execution timed out after 30 seconds',
            error_code: 'TIMEOUT'
          });
        }
        
        if (execError.code === 'ENOBUFS') {
          return res.status(413).json({
            success: false,
            error: 'Output too large',
            error_code: 'OUTPUT_TOO_LARGE'
          });
        }
        
        // For compilation errors, stderr usually contains the error message
        output = '';
        error = execError.stderr || execError.message;
      }

      // Clean up temporary files
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        
        // Clean up compiled executables for C/C++
        if (language === 'cpp' || language === 'c') {
          const executable = path.join('/tmp', `code_${timestamp}_${Math.random().toString(36).substr(2, 9)}`);
          if (fs.existsSync(executable)) {
            fs.unlinkSync(executable);
          }
        }
        
        // Clean up Java class files
        if (language === 'java') {
          const className = `Code_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
          const classFile = path.join('/tmp', `${className}.class`);
          if (fs.existsSync(classFile)) {
            fs.unlinkSync(classFile);
          }
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ Code execution completed in ${responseTime}ms`);

      res.json({
        success: !error,
        output: output || '',
        error: error || null,
        language: language,
        execution_time: responseTime,
        request_id: `run_${timestamp}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Code execution error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during code execution',
        error_code: 'EXECUTION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /api/code/health - Service health check
router.get('/health', async (req, res) => {
  try {
    const geminiStatus = req.geminiService ? await req.geminiService.checkHealth() : false;
    
    res.json({
      status: geminiStatus ? 'healthy' : 'degraded',
      service: 'CodeCraft Code Analysis API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        gemini_ai: geminiStatus ? 'connected' : 'disconnected'
      },
      endpoints: {
        analyze: '/api/code/analyze',
        fix: '/api/code/fix',
        run: '/api/code/run',
        health: '/api/code/health'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/code/docs - API documentation
router.get('/docs', (req, res) => {
  res.json({
    name: 'CodeCraft Code Analysis API',
    version: '1.0.0',
    description: 'AI-powered code analysis and error fixing service',
    endpoints: {
      analyze: {
        method: 'POST',
        path: '/api/code/analyze',
        description: 'Analyze code for errors, warnings, and improvements',
        body: {
          code: 'string (required) - The code to analyze',
          language: 'string (required) - Programming language (python, javascript, java, cpp, c, html, css, typescript)',
          error_message: 'string (optional) - Error message if available',
          context: 'string (optional) - Additional context about the code',
          projectFiles: 'array (optional) - Array of project files for context'
        }
      },
      fix: {
        method: 'POST',
        path: '/api/code/fix',
        description: 'Fix code based on provided error message',
        body: {
          code: 'string (required) - The code to fix',
          language: 'string (required) - Programming language',
          error_message: 'string (required) - The error message to fix',
          line_number: 'number (optional) - Line number where error occurs',
          projectFiles: 'array (optional) - Array of project files for context'
        }
      },
      run: {
        method: 'POST',
        path: '/api/code/run',
        description: 'Execute code and return output',
        body: {
          code: 'string (required) - The code to execute',
          language: 'string (required) - Programming language (python, javascript, java, cpp, c)'
        }
      },
      health: {
        method: 'GET',
        path: '/api/code/health',
        description: 'Check service health status'
      }
    },
    examples: {
      analyze: {
        url: 'POST /api/code/analyze',
        body: {
          code: 'def hello_world():\n    print("Hello, World!"\n    return "Hello"',
          language: 'python',
          error_message: 'SyntaxError: unexpected EOF while parsing'
        }
      },
      fix: {
        url: 'POST /api/code/fix',
        body: {
          code: 'function greet(name {\n    console.log("Hello " + name);\n}',
          language: 'javascript',
          error_message: 'SyntaxError: missing ) after parameter list',
          line_number: 1
        }
      },
      run: {
        url: 'POST /api/code/run',
        body: {
          code: 'print("Hello, World!")\nfor i in range(5):\n    print(f"Count: {i}")',
          language: 'python'
        }
      }
    }
  });
});

export default router;