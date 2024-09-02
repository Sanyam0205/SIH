// routes/systemResponse.js
const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

router.post('/api/system-response', async (req, res) => {
    const { message, file } = req.body;

    try {
        // Call Python script using spawn
        const pythonProcess = spawn('python', ['./python-scripts/chatpdf_script.py', file?.filePath || '']);

        let scriptOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python script error: ${data.toString()}`);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error running Python script' });
            }
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                // Return the Python script output as the response
                res.json({ response: scriptOutput.trim() });
            } else {
                res.status(500).json({ error: `Python script exited with code ${code}` });
            }
        });

    } catch (err) {
        console.error('Error processing system response:', err);
        res.status(500).json({ error: 'Failed to process system response' });
    }
});

module.exports = router;
