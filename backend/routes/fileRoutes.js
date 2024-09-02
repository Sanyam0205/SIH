const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process'); // Import child_process module
const File = require('../model/File'); // Import the file model
const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// API route to handle file uploads
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { originalname, filename, path: filePath } = req.file;
        const newFile = new File({
            originalName: originalname,
            fileName: filename,
            filePath: filePath
        });

        await newFile.save();

        // Execute the Python script and pass the file path as an argument
        const pythonProcess = spawn('python', ['./python-scripts/chatpdf_script.py', filePath]);

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

        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                // Save the Python script's output as a new chat message
                const chatId = req.body.chatId; // Assume chatId is passed in the request body
                const user = 'system'; // Or any identifier for system messages
                const message = scriptOutput.trim();
                const messageType = 'response'; // Or whatever type you use for these messages

                const lastChat = await Chat.findOne({ chatId }).sort({ order: -1 });
                const nextOrder = lastChat ? lastChat.order + 1 : 0;

                const newChat = new Chat({
                    chatId,
                    user,
                    message,
                    messageType,
                    order: nextOrder
                });

                await newChat.save();

                if (!res.headersSent) {
                    res.json({ message: 'File uploaded and processed successfully', chat: newChat, file: newFile });
                }
            } else {
                if (!res.headersSent) {
                    res.status(500).json({ error: `Python script exited with code ${code}` });
                }
            }
        });

    } catch (err) {
        console.error('Error uploading file:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to upload file' });
        }
    }
});

// API route to fetch file metadata and download file
router.get('/download/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const fileRecord = await File.findById(fileId);

        if (!fileRecord) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.resolve(__dirname, '..', fileRecord.filePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on the server' });
        }

        // Send the file to the client for download
        res.download(filePath, fileRecord.originalName);
    } catch (err) {
        console.error('Error fetching file:', err.message);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
});

// API route to fetch file metadata without downloading
router.get('/metadata/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const fileRecord = await File.findById(fileId);

        if (!fileRecord) {
            return res.status(404).json({ error: 'File metadata not found' });
        }

        // Return file metadata to the client
        res.json(fileRecord);
    } catch (err) {
        console.error('Error fetching file metadata:', err.message);
        res.status(500).json({ error: 'Failed to fetch file metadata' });
    }
});

module.exports = router;
