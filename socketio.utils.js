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
    socket.on('add-members', async (data, callback) => {
        const { channelId, additionalMembers } = data;
        try {
            const channel = await Channel.findById(channelId);
            const sortedMembers = Array.from(new Set([...channel.members, ...additionalMembers])).sort();
            channel.members = sortedMembers;
            await channel.save();
            additionalMembers.forEach(async member => {
                const user = await User.findById(member);
                if (user) {
                    user.channelIds.push(channelId);
                    await user.save();
                    io.to(channelId).emit('member-update', user.name);
                    //QUES: why is the user personal room update necessary?
                    //ANSWERED AT THE END OF PAGE
                    io.to(`user: ${user._id}`).emit('user:update', {
                        channelIds: user.channelIds
                    })
                    // socket.emit('current-channel', channelId); //NOTE: the users are joining the room when they are added
                }
            });
        } catch (err) {
            return callback({error: err});
        }
    })
};

module.exports = (io, socket, session) => {
    registerUsers(socket, session),
        joinRooms(socket),
        messaging(io, socket)
}


// Excellent question — and yes, you're right to question whether **per-user rooms** are *really necessary* if **each user has their own socket**.

// Let’s break this down clearly:

// ---

// ## ✅ Short Answer

// If each user has **only one active socket connection** (i.e., single tab/device) **and** your server has access to that exact socket, **you can emit directly to that socket** without needing per-user rooms.

// ```js
// socket.emit('channels-updated', { channelId });
// ```

// However...

// ---

// ## 🧠 Here's Why Per-User Rooms *Are* Useful (and often preferred):

// ### ✅ 1. **Users can have multiple sockets**

// * A user may open your app in multiple tabs or devices — each with its **own socket**.
// * If you only emit to `socket.emit(...)`, you're only reaching **one socket**.
// * With a room like `user:123`, you can target **all their sockets at once**:

// ```js
// io.to(`user:${userId}`).emit('channels-updated', { channelId });
// ```

// So if the user has:

// * One tab open on desktop
// * Another on mobile
// * Or refreshes and reconnects

// They **all stay in sync**.

// ---

// ### ✅ 2. **You don’t always have access to the user’s socket**

// In your `add-members` example:

// ```js
// additionalMembers.forEach(async memberId => {
//     const user = await User.findById(memberId);
//     // Now what? You don’t have their `socket` directly
// });
// ```

// To emit to a user by `socket.emit(...)`, you must have the `socket` instance for that user. But unless:

// * You store and manage a `userId -> socket` map manually, or
// * You put them in a **named room** (like `user:<id>`)

// You can’t reach them easily.

// > With rooms, you don't need their socket instance — you can just call `io.to('user:123')`.

// ---

// ### ✅ 3. **Clean separation of concerns**

// Using rooms:

// * You separate **who to send to** (room logic)
// * From **what to send** (event data)
// * And you avoid storing/managing socket references manually

// ---

// ### ✅ 4. **More scalable**

// When you scale your app across multiple processes (e.g., using Redis or Socket.IO adapter for horizontal scaling):

// * Rooms let all servers know **where a user is connected**
// * Manually tracking sockets doesn’t scale easily

// ---

// ## ❌ When you **don’t need** rooms

// You can skip per-user rooms **if**:

// * Each user only has one connection
// * You only emit to users based on the current socket (i.e., the one emitting the event)
// * You’re okay with updates not reaching all tabs/devices

// So yes — your architecture is fine for small-scale or single-socket-per-user setups.

// Example:

// ```js
// socket.on('add-members', async (data, callback) => {
//     // current user adds others
//     additionalMembers.forEach(async (memberId) => {
//         const memberSocket = findSocketForUser(memberId); // if you store it somewhere
//         if (memberSocket) {
//             memberSocket.emit('channels-updated', { channelId });
//         }
//     });
// });
// ```

// But that means you must:

// * Store a map of userId to socket when users connect
// * Keep it up to date (remove on disconnect, update on reconnect)

// That can get messy over time.

// ---

// ## ✅ Conclusion

// | Approach             | Pros                                       | Cons                                                                |
// | -------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
// | `socket.emit(...)`   | Simple, direct                             | Only works if you have that socket, and only reaches one connection |
// | `io.to('user:<id>')` | Works across tabs/devices, scalable, clean | Requires users to join rooms on connect                             |

// > ✅ **Best practice for real-time multi-user apps** is to use per-user rooms. But for lightweight or single-connection use cases, `socket.emit(...)` can work fine.

// ---

// Let me know if you want to see how to **store user-socket mappings** as an alternative to rooms — or if you'd prefer to implement the **user-room join on connect**.
