const mongoose = require('mongoose');

//A Mongoose model is a wrapper on the Mongoose schema. A Mongoose schema defines the structure of the document, default values, validators, etc., whereas a Mongoose model provides an interface to the database for creating, querying, updating, deleting records, etc.
//topic: what is mongoose and why do we need it
//resource_attached: https://article.arunangshudas.com/why-use-mongoose-with-mongodb-67a026f66386

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    channelIds: Array
})

module.exports = mongoose.model('Users', userSchema);