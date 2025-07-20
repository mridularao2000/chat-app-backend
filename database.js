let mongoose = require('mongoose'); //returns a singleton obj, that means this is created when invoked for the first time, subsequent references are for the same value because of how module import/export works in ES6.

const server = "127.0.0.1:27017";
const database = "chat-users";

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

mongoose.connect(`mongodb://${server}/${database}`, {
    useNewUrlParser: true, //ques: what do these do?
    useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
    console.log('Connection to DB successful');
});

mongoose.connection.on('error', (err) => {
    console.log('error in DB connection', err);
});

module.exports = { mongoose };