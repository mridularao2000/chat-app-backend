const express = require('express');
const cors = require('cors');
const http = require('http');
const socket = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { mongoose } = require('./database');
const registerSocketHandlers = require('./socketio.utils') 

const users = require('./routes/userRoutes');
const auth = require("./routes/authRoutes");
const channel = require('./routes/channelRoutes');
const message = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app); //ques: what's happening here?
const io = socket(server, {
    cors: {
        origin: 'http://localhost:8080/',
        credentials: true
    }
})

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
app.use(express.urlencoded({extended: true})); //ques: what does this do?

// Export io so other files can use it
app.set('io', io);
app.use(session({
    secret: 'secret-key', //used to make cookie.session_id, then is authenticated using this to make sure that cookie was not tampered with
    resave: false, //to make sure that the session is not saved every request,
    saveUninitialized: false, //to make sure that empty sessions aren't saved
    store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: 'sessions',
        ttl: 60 * 60 * 24 * 14 //time to live: 14 days in seconds 
    }),
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        secure: false //todo: set it to true in prod!!!!
    }
}));

//note: to extend session when session is authenticated
app.use((req, res) => {
    if(req.session.id) req.session.touch();
});

app.use('/users', users);
app.use('/auth', auth);
app.use('/channel', channel)
app.use('/message', message)

//ques: what is Socket.io and websockets? DONE
//Socket.io listener, this function runs everytime a client connects to our server, and it's going to assign a socket instance to each new client
io.on('connection', (socket) => {
   console.log(`Socket connected at ${socket}`);
   registerSocketHandlers(socket);

   socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
   });
});
//resource_attached: https://www.geeksforgeeks.org/web-tech/what-is-web-socket-and-how-it-is-different-from-the-http/

module.exports = app;
