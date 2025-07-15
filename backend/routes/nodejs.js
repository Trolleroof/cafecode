import express from 'express';
import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const docker = new Docker();

router.post('/run', async (req, res) => {
  const { code } = req.body;

  // 1. Create temporary directory and write user code
  const tempDir = fs.mkdtempSync('/tmp/nodecode-');
  const filePath = path.join(tempDir, 'main.js');
  fs.writeFileSync(filePath, code);

  let container;

  try {
    // 2. Create the container (no AutoRemove)
    container = await docker.createContainer({
      Image: 'node:20-slim',
      Cmd: ['node', '/code/main.js'],
      Tty: false,
      HostConfig: {
        Binds: [`${tempDir}:/code`],
        Memory: 256 * 1024 * 1024, // 256MB
        NetworkMode: 'none',
      },
    });

    await container.start();
    await container.wait();

    // 3. Fetch container logs (as buffer)
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: false,
      follow: false,
    });

    // 4. Demux Docker log stream manually
    const stdoutChunks = [];
    const stderrChunks = [];

    if (Buffer.isBuffer(logsBuffer)) {
      let i = 0;
      while (i + 8 <= logsBuffer.length) {
        const streamType = logsBuffer[i]; // 1 = stdout, 2 = stderr
        const payloadLength = logsBuffer.readUInt32BE(i + 4);
        const chunk = logsBuffer.slice(i + 8, i + 8 + payloadLength);

        if (streamType === 1) {
          stdoutChunks.push(chunk);
        } else if (streamType === 2) {
          stderrChunks.push(chunk);
        }

        i += 8 + payloadLength;
      }
    }

    const stdout = Buffer.concat(stdoutChunks).toString('utf-8').trim();
    const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim();

    res.json({ output: stdout, error: stderr });
  } catch (err) {
    console.error('Docker execution error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // 5. Clean up temp folder
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Manually remove container if still exists
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (removeErr) {
        console.warn('Container already removed or failed to remove', removeErr.message);
      }
    }
  }
});

export default router;
