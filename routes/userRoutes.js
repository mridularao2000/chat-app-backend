const express = require('express');
const router = express.Router(); //topic: express Router
//.Router() creates an mini-application with mdw and routes, but for a particular part of your project. So chat-app is a project, and within it with it's own routes is Users

//registering user routes here:

router.get('/', (req, res) => {
    console.log("User get route triggered");
});

router.post('/', (req, res) => {
    //need to attach createUser code with mongoDB here
})

module.exports = router;