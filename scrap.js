const axios = require("axios");
const cheerio = require("cheerio");
const Micp = require("./Modal/micp");
const users = require("./users").users;
const getRating = async (username) => {
  const url = `https://www.codechef.com/users/${username}`;
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const rating = $(".rating-number").text();
  if (rating === "") return false;
  return parseInt(rating);
};

// To populate the database with initial rating and score of new users

const populate = async () => {
  const promises = users.map(async (username) => {
    const micp = await Micp.findOne({ username });
    if (!micp) {
      const rating = await getRating(username);
      if (rating !== false) {
        const newMicp = await Micp.create({
          username,
          score: 0,
          currentRating: rating,
          initialRating: rating,
        });
        console.log(newMicp);
      }
    }
  });
  await Promise.all(promises);
};

// cron job to update the score of users every 24 hours

exports.updateRatingsAndScores = async () => {
  const users = await Micp.find();
  const promises = users.map(async (user) => {
    const rating = await getRating(user.username);
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
};

// populate();
