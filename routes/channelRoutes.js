const express = require('express');
const Channel = require('../models/Channel');
const User = require('../models/User');

const channelRouter = express.Router();

//note: getting all chats that a user has
channelRouter.get('/', async (req, res) => {
    try {
        const { id } = req.session.id;
        const user = await User.findById(id);
        res.status(200).send(user.channelIds);
    } catch (err) {
        res.status(500).json(err);
    }
});

//note: creating a new channel - update a channel's members?
channelRouter.post('/', async (req, res) => {
    try {
        const { channelMembers, channelName } = req.body;
        const { id } = req.session.id;
        const user = await User.findById(id);
        const sortedMembers = [...channelMembers].sort();
        const existingChannel = await Channel.findOne({ members: { $all: sortedMembers, $size: sortedMembers.length } });
        if (!existingChannel) {
            const newChannel = await Channel.create({
                channelName: channelName, //name comes from UI
                previousMessage: {},
                members: sortedMembers
            });
            user.channelIds.push(newChannel._id);
            await user.save();
            res.status(200).send({ newChannel, user });
        } else res.status(200).send({ existingChannel, user });
    } catch (err) {
        res.status(500).json(err);
    }
});

channelRouter.put('/:channelId/rename', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { channelName } = req.body;
        const channel = await Channel.findById(channelId);
        channel.channelName = channelName;
        channel.save();
        res.status(204).json("Name changed successfully");
    } catch (err) {
        res.status(500).json(err);
    }
});

channelRouter.put('/:channelId/add-members', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { additionalMembers } = req.body;
        const channel = await Channel.findById(channelId);
        const sortedMembers = Array.from(new Set([...channel.members, ...additionalMembers])).sort();
        channel.members = sortedMembers;
        await channel.save();

        sortedMembers.forEach(async member => {
            const user = await User.findById(member);
            if (user && !user.channelIds.includes(channelId)) {
                user.channelIds.push(channelId);
                await user.save();
            }
        });
        res.status(204).json("Members added successfully");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = channelRouter;