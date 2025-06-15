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
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  // Create a unique filename with timestamp
  const timestamp = Date.now();
  const tempFile = path.join('/tmp', `code_${timestamp}.py`);

  try {
    // Write code to a temporary file
    fs.writeFileSync(tempFile, code);

    // Run the Python code with increased timeout and proper error handling
    const { stdout, stderr } = await execAsync(`python3 "${tempFile}"`, {
      timeout: 30000, // 30 seconds timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large outputs
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