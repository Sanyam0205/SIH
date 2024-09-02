const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
