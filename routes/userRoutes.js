const express = require('express');
const User = require('../models/User');
const router = express.Router(); //topic: express Router
//.Router() creates an mini-application with mdw and routes, but for a particular part of your project. So chat-app is a project, and within it with it's own routes is Users

//registering user routes here:

router.get('/', async (req, res) => {
    console.log("User get route triggered");
    //get user from req query -> search for user
    //note: can userData be anything, not necessarily userName?
    const user = await User.exists(`${userData}`).exec();
    res.send(200).send(user);
});

router.post('/', async (req, res) => {
    //need to attach createUser code with mongoDB here
    try {
        const { userName, userEmail, password } = req.body;
        const newUser = await User.create({
            name: userName,
            email: userEmail,
            password: password
        });
        res.status(200).send(newUser);
    } catch {
        //todo: make sure existing user is not created!!
        console.log("Error occurred in creating the new user, try again");
        res.status(500).json({ error: 'Failed to create user' });
    }
})

router.put('/', async (req, res) => {
    try {
        //find the user with current userName and email then change it:
        const { currentName, currentEmail } = req.body;
        const user = await User.find({ name: `${currentName}`, email: `${currentEmail}` });
        //todo: define updated name and email
        user.name = updatedName;
        user.email = updatedEmail;
        user.save();
        res.status(200).json({ response: 
            { message: 'Updated successfully', 
            body: user } 
        });
    } catch {
        console.log('Failed to update userData');
        res.status(500).json({ error: 'Failed to update the userData' })
    }
})

router.delete('/', async (req, res) => {
    try {
        const { userName, userEmail } = req.body;
        const newUser = await User.deleteOne({
            name: userName,
            email: userEmail
        });
        res.status(204).send('Resouce deleted successfully'); //note: gotta send this as json??
    } catch {
        console.log("Error occurred in deleting the user, try again");
        res.status(500).json({ error: 'Failed to delete user' });
    }
})

module.exports = router;