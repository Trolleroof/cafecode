import express from 'express';
import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const docker = new Docker();

router.post('/run', async (req, res) => {
  const { code } = req.body;

  // 1. Create a temp folder and write main.py
  const tempDir = fs.mkdtempSync('/tmp/pycode-');
  const filePath = path.join(tempDir, 'main.py');
  fs.writeFileSync(filePath, code);

  try {
    // 2. Create and start the container
    const container = await docker.createContainer({
      Image: 'python:3.11-slim',
      Cmd: ['python', '/code/main.py'],
      Tty: false,
      HostConfig: {
        Binds: [`${tempDir}:/code`],
        AutoRemove: true,
        Memory: 256 * 1024 * 1024,
        NetworkMode: 'none',
      },
    });

    await container.start();
    await container.wait(); // wait for script to finish

    // 3. Get logs as Buffer (multiplexed format)
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
    });

    let output = '';
    let errorOutput = '';

    // 4. Manually demux logsBuffer
    if (Buffer.isBuffer(logsBuffer)) {
      const stdoutChunks = [];
      const stderrChunks = [];

      let i = 0;
      while (i + 8 <= logsBuffer.length) {
        const streamType = logsBuffer[i]; // 1 = stdout, 2 = stderr
        const chunkLength = logsBuffer.readUInt32BE(i + 4);
        const chunk = logsBuffer.slice(i + 8, i + 8 + chunkLength);

        if (streamType === 1) {
          stdoutChunks.push(chunk);
        } else if (streamType === 2) {
          stderrChunks.push(chunk);
        }

        i += 8 + chunkLength;
      }

      output = Buffer.concat(stdoutChunks).toString('utf-8');
      errorOutput = Buffer.concat(stderrChunks).toString('utf-8');
    } else {
      output = logsBuffer.toString();
    }

    // 5. Send response
    res.json({
      output: output.trim(),
      error: errorOutput.trim()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // 6. Clean up the temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

export default router;
