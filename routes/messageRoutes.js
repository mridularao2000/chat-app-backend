const express = require('express');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

const messageRouter = express.Router();

messageRouter.post('/:channelId', async (req, res) => {
    const { messageBody, sender } = req.body;
    const { channelId } = req.params;
    try {
        const newMessage = await Message.create({
            messageBody,
            sender,
            channelId
        });
        await Channel.findByIdAndUpdate(channelId, {
            latestMessage: {
                messageBody: newMessage.messageBody,
                sender: newMessage.sender,
                messageId: newMessage._id,
                deleted: false,
                edited: false,
                createdAt: newMessage.createdAt
            }
        });
        res.status(200).send(newMessage);
    } catch (err) {
        res.status(500).json({ message: 'Failed to send message' });
    }
});

messageRouter.get('/:channelId/messages', async (req, res) => {
    const channelId = req.params;
    try {
        const messages = await Message.find({ channelId: channelId }).sort({ createdAt: -1 }).limit(20);
        res.send(200).send(messages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to load messages' });
    }
});

messageRouter.put('/:channelId/modify/:messageId', async (req, res) => {
    const { modifiedMessage } = req.body;
    const { channelId, messageId } = req.params;
    try {
        const message = await Message.findById(messageId);
        message.messageBody = modifiedMessage;
        message.edited = true;
        await message.save();
        const channel = await Channel.findOne(channelId);
        if (channel.previousMessage.messageId === messageId) {
            channel.previousMessage = message;
            await channel.save();
        }
        res.status(200).json(message);
    } catch {
        res.status(500).json({ message: 'Failed to edit message' });
    }

});

messageRouter.delete('/:channelId/delete/:messageId', async (req, res) => {
    const { messageId, channelId } = req.params;
    try {
        const message = await Message.deleteOne(messageId);
        message.deleted = true;
        message.messageBody = undefined;
        const channel = await Channel.findOne(channelId);
        if (channel.previousMessage.messageId === messageId) {
            channel.previousMessage = message;
            await channel.save();
        }
        res.send(204).send('Message deleted successfully');
    } catch {
        res.status(500).json({ message: 'Failed to delete message' });
    }
})

module.exports = messageRouter;