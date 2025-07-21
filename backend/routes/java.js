import express from 'express';
import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
const router = express.Router();
const docker = new Docker();

router.post('/run', async (req, res) => {
  const { code } = req.body;
  const tempDir = fs.mkdtempSync('/tmp/javacode-');
  const filePath = path.join(tempDir, 'Main.java');
  fs.writeFileSync(filePath, code);

  try {
    const container = await docker.createContainer({
      Image: 'openjdk:21-slim',
      Cmd: [
        'bash',
        '-c',
        'javac /code/Main.java && java -cp /code Main'
      ],
      Tty: false,
      HostConfig: {
        Binds: [`${tempDir}:/code`],
        AutoRemove: true,
        Memory: 256 * 1024 * 1024,
        NetworkMode: 'none',
      },
    });

    await container.start();
    await container.wait();
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
    });

    let output = '';
    let errorOutput = '';

    if (Buffer.isBuffer(logsBuffer)) {
      const stdoutChunks = [];
      const stderrChunks = [];
      let i = 0;
      while (i + 8 <= logsBuffer.length) {
        const streamType = logsBuffer[i];
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

    res.json({
      output: output.trim(),
      error: errorOutput.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

export default router; 