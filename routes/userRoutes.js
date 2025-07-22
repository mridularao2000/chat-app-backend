const express = require('express');
const User = require('../models/User');
const userRouter = express.Router(); //topic: express Router
//.Router() creates an mini-application with mdw and routes, but for a particular part of your project. So chat-app is a project, and within it with it's own routes is Users

//note: get user from req query -> search for user
userRouter.get('/', async (req, res) => {
    const { userData } = req.body;
    const user = await User.find({
        $or: [
            { email: new RegExp(userData, 'i') },
            { userName: new RegExp(userData, 'i') }
        ]
    }); //This finds all users whose email or userName matches the input.
    //note: RegExp expression includes all results incomplete input can be a part of - 'jo' gives back 'John', 'jhoNNy', etc. 'i' specifically means a flag meaning case-insensitive matching (apprently) :/
    res.status(200).send(user);
});

//note: find the user with current userName and email then change it:
userRouter.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { updatedName, updatedEmail } = req.body;
        const user = await User.findById(userId);
        user.name = updatedName;
        user.email = updatedEmail;
        await user.save();
        res.status(200).json({ response: 
            { message: 'Updated successfully', 
            body: user } 
        });
    } catch {
        console.log('Failed to update userData');
        res.status(500).json({ error: 'Failed to update the userData' })
    }
})

userRouter.delete('/', async (req, res) => {
    try {
        const { userName, userEmail } = req.body;
        await User.deleteOne({
            name: userName,
            email: userEmail
        });
        res.status(204).send('Resouce deleted successfully'); //note: gotta send this as json??
    } catch {
        console.log("Error occurred in deleting the user, try again");
        res.status(500).json({ error: 'Failed to delete user' });
    }
})

module.exports = userRouter;