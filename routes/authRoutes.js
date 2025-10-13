const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authRouter = express.Router();

authRouter.post('/signup', async (req, res) => { //UGLY: we probably don't need this
    const { userName, userEmail, password } = req.body;
    const user = await User.findOne({ userEmail });
    if (!user) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            name: userName,
            email: userEmail,
            password: hashedPassword,
            channelIds: []
        });
        req.session.userId = newUser._id;
        res.status(200).send(newUser);
    } else res.status(400).json({ message: 'User already exists, please login' });
})

authRouter.post('/login', async (req, res) => {
    const { userName, password } = req.body;
    const user = await User.findOne({ userName });
    if (!user || !bcrypt.compare(user.password, password)) {
        res.status(401).json({ message: "Invalid credentials. If account doesn't exist, then please register." });
    }
    req.session.regenerate((err) => console.log('Failed to regenerate session!!', err)); //It does not auto-refresh the session every time the user visits or reloads the page. It only clears the previous session and starts a new one.
    req.session.id = user._id;
    res.status(200).json({ message: 'Login successful' });
}); //note: when the token expires after 14 days of non usage, this will run

authRouter.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out' });
    });
}); //ques: what's happening here?
//In the above code, we call the destroy() method on the session object to remove the session data. Once the session is destroyed, the user is considered logged out.

authRouter.get('/session-data', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await User.findById(req.session.userId).select('-password').populate({
        path: 'channelIds',
        select: 'name' // only get the channel name (and _id by default)
      });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
}); //NOTE: req.session.id refers to the session’s internal ID — it always exists if a session is loaded (even if it's empty). It doesn't guarantee that the user is authenticated — just that the session exists.


module.exports = authRouter;