require('dotenv').config();
let mongoose = require('mongoose'); //returns a singleton obj, that means this is created when invoked for the first time, subsequent references are for the same value because of how module import/export works in ES6.
//todo: setup an actual mongo db server
// const server = "127.0.0.1:27017";
// const database = "chat-users";
const mongoURL = process.env.MONGO_URL
console.log("mongoURL========>", mongoURL);

mongoose.connect(mongoURL).then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));;

mongoose.connection.on('connected', () => {
    console.log('Connection to DB successful');
});

mongoose.connection.on('error', (err) => {
    console.log('error in DB connection', err);
});

module.exports = { mongoose };


//note: the below code automatically connects to DB, but the mongoose.connect is encapsulated, and can't be exported since we are also using mongoose-connect pkg.
// class UserData {
//     constructor() {
//         this._connect();
//     }
//     _connect() {
//         mongoose
//         .connect(`mongodb://${server}/${database}`)
//         .then(() => {
//             console.log("Mongo server connected!!");
//         })
//         .catch(() => {
//             console.log("Database connection error");
//         })
//     }
// }