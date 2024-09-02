const express = require('express');
const Chat = require('../model/Chat');

const router = express.Router();

// Get all chats for a specific chat session
router.get('/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;

        // Fetch chats related to the given chatId and sort by creation time (oldest first)
        const chats = await Chat.find({ chatId }).sort({ createdAt: 1 }); // Ascending order

        // Send the sorted chats back as a response
        res.json(chats);
    } catch (err) {
        // Handle errors gracefully by sending a 500 status code and error message
        res.status(500).json({ error: err.message });
    }
});


// Post a new chat
router.post('/', async (req, res) => {
    const { chatId, user, message, messageType } = req.body;

    try {
        // Find the highest order number for the given chatId to maintain sequence
        const lastChat = await Chat.findOne({ chatId }).sort({ order: -1 });

        // Determine the next order number
        const nextOrder = lastChat ? lastChat.order + 1 : 0;

        const newChat = new Chat({
            chatId,
            user,
            message,
            messageType,
            order: nextOrder
        });

        await newChat.save();
        res.json(newChat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
