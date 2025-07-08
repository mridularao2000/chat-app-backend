const express = require('express');
const cors = require('cors');
const app = express();

const users = require('../routes/userRoutes');
const auth = require("../routes/authRoutes");

//topic: CORS
app.use(cors({
    origin: 'http://localhost:3000/'
}));
//restricting AJAX access to a single origin
//TODO: enable HTTP cookies over CORS
//resource_attached: https://medium.com/zero-equals-false/using-cors-in-express-cac7e29b005b 


//resource_attached: (for understanding routers): https://medium.com/@sesitamakloe/how-we-structure-our-express-js-routes-58933d02e491
app.use('/users', users);
app.use('/auth', auth);

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    console.log("get req successfull===>");
})

app.listen(port, () => {
    console.log(`server started on port ${port}`)
});