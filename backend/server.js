const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const chatRoutes = require('./routes/chatRoutes');
const ChatSessionRoutes = require('./routes/ChatSessionRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/mern-chatbox', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/chats', chatRoutes);
app.use('/api/chats', ChatSessionRoutes);
app.use('/api/chats/sessions', ChatSessionRoutes);
app.use('/api/files', require('./routes/fileRoutes'));

app.post('/api/system-response', async (req, res) => {
  const { message, file } = req.body;

  // Validate the incoming request data
  if (!message && (!file || !file.filePath)) {
      return res.status(400).json({ error: 'Invalid request data. A message or a valid file path is required.' });
  }

  try {
      // Prepare the Python script arguments
      const pythonArgs = ['./python-scripts/chatpdf_script.py'];
      if (file && file.filePath) {
          pythonArgs.push(file.filePath);  // Add the file path if provided
      } else {
          pythonArgs.push('');  // Ensure an empty string is passed if no file path is given
      }

      // Execute the Python script with arguments
      const pythonProcess = spawn('python', pythonArgs);
      
      let scriptOutput = '';
      let scriptError = '';

      // Handle data from the Python script
      pythonProcess.stdout.on('data', (data) => {
          scriptOutput += data.toString();
      });

      // Handle errors from the Python script
      pythonProcess.stderr.on('data', (data) => {
          scriptError += data.toString();
      });

      // Return the output after the Python script finishes execution
      pythonProcess.on('close', (code) => {
          if (code === 0) {
              if (!res.headersSent) {  // Ensure headers are not already sent
                  res.json({ response: scriptOutput.trim() });
              }
          } else {
              console.error(`Python script error: ${scriptError}`);
              if (!res.headersSent) {  // Ensure headers are not already sent
                  res.status(500).json({ error: 'Error running Python script' });
              }
          }
      });

  } catch (err) {
      console.error('Error processing system response:', err);
      if (!res.headersSent) {  // Ensure headers are not already sent
          res.status(500).json({ error: 'Failed to process system response' });
      }
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
