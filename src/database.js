let mongoose = require('mongoose'); //returns a singleton obj, that means this is created when invoked for the first time, subsequent references are for the same value because of how module import/export works in ES6.

const server = "127.0.0.1:27017";
const database = "chat-users";

class UserData {
    constructor() {
        this._connect();
    }
    _connect() {
        mongoose
        .connect(`mongodb://${server}/${database}`)
        .then(() => {
            console.log("Mongo server connected!!");
        })
        .catch(() => {
            console.log("Database connection error");
        })
    }
}

module.exports = new UserData();