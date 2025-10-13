const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    messageBody: { type: String, required: true },
    channelId: { type: String, required: true },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

messageSchema.index({ channelId: 1, createdAt: -1 }); //ques: what is this line?
// This line creates a compound index on the Message collection. 'channelId: 1' is important to index messages in ascending order. 'createdAt: -1' will get timeStamps by latest first

module.exports = mongoose.model('Message', messageSchema);