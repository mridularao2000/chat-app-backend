const mongoose = require('mongoose');

//A Mongoose model is a wrapper on the Mongoose schema. A Mongoose schema defines the structure of the document, default values, validators, etc., whereas a Mongoose model provides an interface to the database for creating, querying, updating, deleting records, etc.

const userSchema = new mongoose.Schema({
    name: String,
    uuid: crypto.randomUUID()
})

module.exports = mongoose.Model('Users', userSchema);