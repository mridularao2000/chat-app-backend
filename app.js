const express = require('express');
const cors = require('cors');
const http = require('http');
const socket = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { mongoose } = require('./database');
const sharedSession = require('express-socket.io-session');
const registerSocketHandlers = require('./socketio.utils')

const users = require('./routes/userRoutes');
const auth = require("./routes/authRoutes");
const channel = require('./routes/channelRoutes');
const message = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app); //ques: what's happening here?
const io = socket(server)


// {
//     cors: {
//         origin: 'http://localhost:8080/',
//         credentials: true
//     }
// }

//topic: CORS DONE
app.use(cors({
    origin: 'http://localhost:8080/',
    credentials: true
}));
//restricting AJAX access to a single origin
//TODO: enable HTTP cookies over CORS
//resource_attached: https://medium.com/zero-equals-false/using-cors-in-express-cac7e29b005b 

//resource_attached: (for understanding routers): https://medium.com/@sesitamakloe/how-we-structure-our-express-js-routes-58933d02e491
app.use(express.json()); //ques: what does this do?
app.use(express.urlencoded({ extended: true })); //ques: what does this do?

// Export io so other files can use it
app.set('io', io);
mongoose.connection.once('open', () => {
    console.log('✅ MongoDB connected');

    const sessionMiddleware = session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client: mongoose.connection.getClient(), // ✅ Works now because connection is open
            collectionName: 'sessions',
            ttl: 60 * 60 * 24 * 14,
        }),
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 14,
            secure: false, // Set to true in production!
        },
    });

    app.use(sessionMiddleware);
    //note: to extend session when session is authenticated
    app.use((req, res, next) => {
        if (req.session.id) req.session.touch();
        next();
    });

    // io.use(sharedSession(sessionMiddleware, { //note: this is to share the session with the socket
    //     autoSave: true
    // }));
    io.use((socket, next) => {
        sessionMiddleware(socket.request, {}, next);
      });
    app.get('/', (req, res) => res.send('Hello! The api call is working!!!!'));
    app.use('/users', users);
    app.use('/auth', auth);
    app.use('/channel', channel)
    app.use('/message', message)

    //ques: what is Socket.io and websockets? DONE
    //Socket.io listener, this function runs everytime a client connects to our server, and it's going to assign a socket instance to each new client
    io.on('connection', (socket) => {
        console.log(`Socket connected at ${socket}`);
        // socket.emit('hello', { message: 'Hello from server!' });
        const session = socket.request.session;
        console.log('Socket connected, session ID:', session.id);
        session.save();
        registerSocketHandlers(io, socket, session);
        socket.on('disconnect', async () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
    //resource_attached: https://www.geeksforgeeks.org/web-tech/what-is-web-socket-and-how-it-is-different-from-the-http/
    // const PORT = process.env.PORT || 3000;
    // server.listen(PORT, () => {
    //     console.log(`🚀 Server running at http://localhost:${PORT}`);
    // });
});

module.exports = server;
