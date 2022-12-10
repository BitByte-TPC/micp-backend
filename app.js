const express = require('express');
const morgan = require('morgan');
const cors = require("cors");

const app = express();

//middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({
    limit: '50mb', extended: true,
}));

app.enable('trust proxy');

app.use(express.json({limit: '50mb'}));
app.use(cors({
    credentials: true,
    origin: ['http://localhost:3000', 'https://frontend-gamma-sage.vercel.app', 'https://lostandfoundiiitdmj.vercel.app']
}));


app.get("/", (req, res) => {
    res.status(200).json({
        status: true, msg: "working...", user: req.user
    })
})

// to handled unregister endpoint
app.all('*', (req, res) => {
    res.status(404).json({
        status: false, msg: `Can't find ${req.originalUrl} on this server!`
    })
});

module.exports = app;
