const express = require('express');
const router = express.Router();
const ChatSession = require('../model/ChatSession');
const Chat = require('../model/Chat');

// Create a new chat session
router.post('/sessions', async (req, res) => {
    const { title } = req.body;
    try {
        const newChatSession = new ChatSession({ title });
        await newChatSession.save();
        res.json(newChatSession);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/all', async (req, res) => {
    try {
        const sessions = await ChatSession.find();
        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
});

module.exports = router;
// Fetch all messages for a particular session
router.get('/sessions/:sessionId/chats', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const chats = await Chat.find({ chatId: sessionId }).sort({ createdAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Post a new message to a specific session
router.post('/sessions/:sessionId/chats', async (req, res) => {
    const { sessionId } = req.params;
    const { user, message } = req.body;
    try {
        const newChat = new Chat({ chatId: sessionId, user, message });
        await newChat.save();
        res.json(newChat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a chat session
router.delete('/sessions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        await Chat.deleteMany({ chatId: sessionId }); // Delete all chats associated with the session
        const result = await ChatSession.findByIdAndDelete(sessionId); // Delete the chat session
        if (!result) return res.status(404).json({ error: 'Chat session not found' });
        res.json({ message: 'Chat session deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
