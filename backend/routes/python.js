import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

router.post('/run', async (req, res) => {
  console.log('Received request to /api/python/run');
  const code = req.body.code;
  
  // Input validation and sanitization
  if (!code || typeof code !== 'string' || code.length === 0) {
    return res.status(400).json({ 
      error: 'No code provided or invalid input',
      error_code: 'INVALID_INPUT'
    });
  }
  
  // Check for potentially dangerous patterns in Python code
  const dangerousPatterns = [
    /import\s+os\s*;?\s*os\.system\s*\(/i,
    /import\s+subprocess\s*;?\s*subprocess\.run\s*\(/i,
    /import\s+subprocess\s*;?\s*subprocess\.call\s*\(/i,
    /import\s+subprocess\s*;?\s*subprocess\.Popen\s*\(/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /__import__\s*\(/i,
    /compile\s*\(/i,
    /input\s*\(/i,
    /open\s*\(/i,
    /file\s*\(/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return res.status(400).json({
        error: 'Code contains potentially dangerous operations that are not allowed',
        error_code: 'DANGEROUS_CODE_DETECTED'
      });
    }
  }

  // Create a unique filename with timestamp and random string
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  const tempFile = path.join('/tmp', `code_${timestamp}_${randomSuffix}.py`);

  try {
    // Write code to a temporary file
    fs.writeFileSync(tempFile, code);

    // Run the Python code with increased timeout and proper error handling
    const { stdout, stderr } = await execAsync(`python3 "${tempFile}"`, {
      timeout: 30000, // 30 seconds timeout
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
      cwd: '/tmp' // Restrict working directory
    });

    // Log the output and error for debugging
    console.log('Python Script stdout:', stdout);
    console.error('Python Script stderr:', stderr);

    // Clean up the temp file
    fs.unlinkSync(tempFile);

    // Return the results
    res.json({
      output: stdout,
      error: stderr || null,
      success: !stderr
    });

  } catch (error) {
    // Clean up the temp file in case of error
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    // Handle different types of errors
    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        error: 'Execution timed out after 30 seconds',
        details: error.message
      });
    }

    if (error.code === 'ENOBUFS') {
      return res.status(413).json({
        error: 'Output too large',
        details: 'The program output exceeded the maximum buffer size'
      });
    }

    return res.status(500).json({
      error: 'Python execution failed',
      details: error.message,
      stderr: error.stderr || null
    });
  }
});

export default router; 