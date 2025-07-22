const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    channelName: String,
    previousMessage: {
        messageBody: String,
        sender: String,
        messageId: String,
        deleted: Boolean,
        edited: Boolean,
        createdAt: Date,
    },
    members: Array
});

module.exports = mongoose.model('Channel', channelSchema);