const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    channelName: { type: String },
    previousMessage: {
        messageBody: { type: String },
        sender: { type: mongoose.Schema.Types.ObjectId },
        messageId: { type: mongoose.Schema.Types.ObjectId },
        deleted: { type: Boolean },
        edited: { type: Boolean },
        createdAt: Date,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Channel', channelSchema);