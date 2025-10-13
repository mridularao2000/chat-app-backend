//note: writing socket.io utils and exporting them as you need:
//note: real-time activities DB updating happening here

const { ObjectId } = require("mongodb");
// 1. mongoose.Types.ObjectId:
// This is Mongoose’s wrapper around the MongoDB driver’s ObjectId.
// It integrates tightly with how Mongoose handles schemas, casting, and validation.
// Mongoose expects its own internal ObjectId instances when dealing with things like _id fields, refs, and queries.

// 2. ObjectId from "mongodb"
// This is the native ObjectId from the MongoDB driver.
// Works perfectly if you're using mongodb directly (not Mongoose).
// Mongoose usually can handle it, but:
// Some internal operations (like schema casting, comparisons, populate, etc.) can break or behave inconsistently.

const Channel = require("./models/Channel");
const User = require("./models/User")
const bcrypt = require("bcryptjs");
const Message = require("./models/Message");
const { mongoose } = require("./database");

//QUES: what is ObjectId? 

const registerUsers = (socket, session) => {
    socket.on('register', async (data, callback) => {
        // const userId = req.session.userId;
        const { userId, userName, userEmail, password } = data;
        console.log(`User ${userId} connected`);
        let currentUser;
        if (!userId) {
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = await User.create({
                name: userName,
                email: userEmail,
                password: hashedPassword,
                channelIds: []
            });
            
            currentUser = newUser;
            const personalChannel = await Channel.create({
                channelName: 'You',
                previousMessage: {},
                members: [currentUser._id]
            })
            newUser.channelIds.push(personalChannel._id);
            await newUser.save();
            
            socket.join(personalChannel._id.toString());
            session.userId = new ObjectId(newUser._id).toString();
        } else {
            session.userId = userId;
            currentUser = await User.findById(userId).select('+password').populate({
                path: 'channelIds',
                select: 'channelName' // only get the channel name (and _id by default)
            });
        }
        const isMatch = await bcrypt.compare(password, currentUser.password);
        if (!isMatch) {
            return callback({ error: 'Invalid password.' });
        }

        // Join all existing channel rooms
        if (currentUser?.channelIds.length) {
            currentUser.channelIds.forEach(channelId => {
                socket.join(channelId);
            });
        }
        socket.emit('registered', currentUser);
    });
}

const messaging = (io, socket) => {
    socket.on('send-message', async (messageData, callback) => {
        const {
            sender,
            messageBody,
            channelId
        } = messageData;

        try {
            const newMessage = await Message.create({
                messageBody,
                sender,
                channelId: new mongoose.Types.ObjectId(channelId)
            });
            await Channel.findByIdAndUpdate(new mongoose.Types.ObjectId(channelId), {
                previousMessage: {
                    messageBody: newMessage.messageBody,
                    sender: newMessage.sender,
                    deleted: false,
                    edited: false,
                    createdAt: newMessage.createdAt
                }
            });
            //QUES: how to receive this in the UI?
            io.to(channelId).emit('receive-message', newMessage);
            // return callback({ data: newMessage })
        } catch {
            return callback({error: 'Sending message failed'});
        }
    })
}
//note: the socket is the particular client's socket, each particular client has a socket id, and they are joining the same room
const joinRooms = (socket) => {
    socket.on('current-channel', channelId => socket.join(channelId));
    socket.on('join-room', async (channelData) => {
        const {
            channelName,
            channelMembers, // Array of userIds 
            userId
        } = channelData;

        const sortedMembers = [...channelMembers].sort();
        let existingChannel = await Channel.findOne({
            members: { $size: sortedMembers.length, $all: sortedMembers }
        });
        if (existingChannel) {
            socket.join(existingChannel._id.toString()); // join room
        }
        const newChannel = await Channel.create({
            channelName,
            previousMessage: {},
            members: sortedMembers
        });
        await Promise.all(sortedMembers.map((memberId) =>
            User.findByIdAndUpdate(memberId, {
                $addToSet: { channelIds: newChannel._id }
            })
        ));
        socket.join(newChannel._id.toString());
        socket.emit('channel-created', newChannel); //return the data to the requester
        // 7. Notify other online users (if you track socketIds)
        for (const memberId of sortedMembers) {
            if (memberId !== userId) {
                const member = await User.findById(memberId);
                if (member?.socketId) {
                    const memberSocket = io.sockets.sockets.get(member.socketId); //io.sockets.sockets is a Map of all connected socket instances.
                    // If get(socketId) returns undefined, it means the socket (user) is offline (disconnected).
                    if (memberSocket) {
                        memberSocket.join(newChannel._id.toString());
                    }
                }
            }
        }
    });

    socket.on('leave-room', async (channelId, userId) => {
        socket.leave(channelId);
        await Channel.findByIdAndUpdate(channelId, {
            $pull: {
                members: userId
            }
        });
        await User.findByIdAndUpdate(userId, {
            $pull: {
                channelIds: channelId
            }
        });
    });
};

module.exports = (io, socket, session) => {
    registerUsers(socket, session),
        joinRooms(socket),
        messaging(io, socket)
}