const express = require("express");
const cors = require("cors");
const { updateRatingsAndScores } = require("./scrap");
const cron = require("node-cron");
const app = express();
const users = require("./users.json");

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({
    status: true,
    msg: "working..."
  });
});

app.get("/users", (req, res) => {
  res.status(200).json(users)
})

// croning the updateRatingsAndScores function every 24 hours
cron.schedule("0 0 * * *", async () => { 
  await populate(); 
  await updateRatingsAndScores();
  console.log("updated scores and ratings");
});

// to ping the render server to stay alive
cron.schedule('*/10 * * * *', async () => {
  await axios.get('https://micp-backend.onrender.com/').then((response) => {
     console.log(response.status, response.statusText);
   }).catch((error) => {
     console.log(error);
   })
 });

// to handled unregister endpoint
app.all("*", (req, res) => {
  res.status(404).json({
    status: false,
    msg: `Can't find ${req.originalUrl} on this server!`,
  });
});

module.exports = app;