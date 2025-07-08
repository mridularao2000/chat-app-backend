const express = require('express');
const router = express();

router.get('/', (req, res) => {
    console.log("Auth get route triggered");
})