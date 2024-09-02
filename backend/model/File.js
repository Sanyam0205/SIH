const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
