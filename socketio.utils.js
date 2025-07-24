//note: writing socket.io utils and exporting them as you need:
//note: real-time activities DB updating happening here

const Channel = require("./models/Channel");
const User = require("./models/User")

const registerUsers = (socket) => {
    socket.on('register', async userId => {
        console.log(`User ${userId} connected`);

        const user = await User.findById(userId);

        // Join user's personal room
        socket.join(userId.toString());

        // Join all existing channel rooms
        if (user?.channelIds?.length) {
            user.channelIds.forEach(channelId => {
                socket.join(channelId.toString());
            });
        }
    });
}



const messaging = (io, socket) => {
    socket.on('send-message', async messageData => {
        const {
            sender,
            messageBody,
            channelId
        } = messageData;

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
        io.to(channelId).emit('receive-message', newMessage);
    })
}

//note: the socket is the particular client's socket, each particular client has a socket id, and they are joining the same room
const joinRooms = (socket) => {

    socket.on('join-room', async (channelData) => {
        const {
            channelName,
            channelMembers, // Array of userIds 
            userId
        } = channelData;

        const sortedMembers = [...channelMembers].sort();
        let existingChannel = await Channel.findOne({
            members: { $all: sortedMembers, $size: sortedMembers.length }
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

module.exports = (io, socket) => {
    registerUsers(socket),
        joinRooms(socket),
        messaging(io, socket)
}