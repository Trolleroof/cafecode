import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const analysisSchema = Joi.object({
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid(
    'python', 'javascript', 'java', 'cpp', 'c', 
    'html', 'css', 'typescript'
  ).required(),
  error_message: Joi.string().max(1000).optional(),
  context: Joi.string().max(500).optional()
});

const fixSchema = Joi.object({
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid(
    'python', 'javascript', 'java', 'cpp', 'c', 
    'html', 'css', 'typescript'
  ).required(),
  error_message: Joi.string().min(1).max(1000).required(),
  line_number: Joi.number().integer().min(1).optional()
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
          context: 'string (optional) - Additional context about the code'
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
          line_number: 'number (optional) - Line number where error occurs'
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
      }
    }
  });
});

export default router;