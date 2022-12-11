const axios = require("axios");
const cheerio = require("cheerio");
const Micp = require("./models/micp");
const {parse} = require('csv-parse');
const getRating = async (username) => {
  const url = `https://www.codechef.com/users/${username}`;
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const rating = $(".rating-number").text();
  if (rating === "") return false;
  return parseInt(rating);
};

// To populate the database with initial rating and score of new users

const populate = async (dat) => {
  let count = 0;
  for(const user of dat) {
    console.log(++count);
    const id = user["ID"];
    const micp = await Micp.findOne({ username:id });
    if (!micp) {
      const rating = await getRating(id);
      if (rating !== false) {
        await Micp.create({
          username: id,
          score: 0,
          currentRating: rating,
          initialRating: rating,
          name: user["Name"],
        });
      }
    }
  }
  console.log('All users added/updated')
};

// cron job to update the score of users every 24 hours
const updateRatingsAndScores = async () => {
  const users = await Micp.find();
  const promises = users.map(async (user, i) => {
    const rating = await getRating(user.username);
    console.log(i)
    if (rating > user.currentRating) {
      user.score += rating - user.currentRating;
      user.initialRating = user.currentRating;
      user.currentRating = rating;

      await user.save();
    } else if (rating < user.currentRating) {
      user.score -= user.currentRating - rating;
      user.initialRating = user.currentRating;
      user.currentRating = rating;
      if (user.score < 0) user.score = 0;
      await user.save();
    }
  });
  await Promise.all(promises);
  console.log("Ratings updated")
};

const fetchData = async () => {
  const dat = []
  const data = await axios.get("https://docs.google.com/spreadsheets/d/1E4fT40UVM8h1lZ83kNJT25QrOgrM9m7Z4COSAs6IUhE/gviz/tq?tqx=out:csv", {responseType: 'stream'})
  data.data.pipe(
      parse({
        delimiter: ",",
        columns: true,
        ltrim: true,
      })
  ).on("data", function (row) {
      dat.push(row);
  }).on("error", function (error) {
        console.log(error.message);
  }).on("end", function () {
        console.log("parsed csv data:");
        // console.log(dat);
        populate(dat)
      });

}

module.exports = { updateRatingsAndScores, populate, fetchData }
