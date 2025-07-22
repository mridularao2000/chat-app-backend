const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: String,
    messageBody: String, 
    channelId: String,
    edited: false,
    deleted: false,
}, {
    timestamps: true
});

messageSchema.index({ channelId: 1, createdAt: -1 }); //ques: what is this line?
//note: This line creates a compound index on the Message collection. 'channelId: 1' is important to index messages in ascending order. 'createdAt: -1' will get timeStamps by latest first

module.exports = mongoose.model('Message', messageSchema);