const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse');
const Micp = require('./models/micp');

const getRating = async (username) => {
  const url = `https://www.codechef.com/users/${username}`;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const rating = $('.rating-number')?.text() || '';
    if (rating === '') return false;
    return parseInt(rating, 10);
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

// To populate the database with initial rating and score of new users

const populate = async (dat) => {
  let micpPromises = [];
  dat.forEach((user) => {
    const id = user.ID;
    micpPromises.push(Micp.findOne({ username: id }).lean().exec());
  });

  micpPromises = await Promise.all(micpPromises);
  let ratingPromises = [];
  const filteredUsers = [];
  for (let i = 0; i < micpPromises.length; i++) {
    if (micpPromises[i] === null) {
      const user = dat[i];
      filteredUsers.push(user);
      const id = user.ID;
      ratingPromises.push(getRating(id));
    }
  }
  ratingPromises = await Promise.all(ratingPromises);

  const promises = [];
  for (let i = 0; i < filteredUsers.length; i++) {
    const user = filteredUsers[i];
    const id = user.ID;
    const name = user.Name;
    const rating = ratingPromises[i];
    if (rating) {
      const newUser = new Micp({
        username: id,
        name,
        currentRating: rating,
        initialRating: rating,
        score: 0,
      });
      promises.push(newUser.save());
    }
  }
  await Promise.all(promises);
  console.log('Data populated');
};

// cron job to update the score of users every 24 hours
const updateRatingsAndScores = async () => {
  const users = await Micp.find() || [];
  const promises = [];
  try {
    users.forEach((user) => {
      const url = `https://www.codechef.com/users/${user.username}`;
      const promise = new Promise(async (resolve) => {
        const response = await axios.get(url);
        resolve({
          user,
          response,
        });
      });
      promises.push(promise);
    });
    await Promise.all(promises).then((data) => {
      data.forEach(async (item) => {
        const { user } = item;
        const $ = cheerio.load(item.response.data);
        const rating = parseInt($('.rating-number')?.text() || '0', 10);
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
    });
  } catch (err) {
    console.log(err.status);
  }
  console.log('Ratings updated');
};

const fetchData = async () => {
  const dat = [];
  const data = await axios.get('https://docs.google.com/spreadsheets/d/1E4fT40UVM8h1lZ83kNJT25QrOgrM9m7Z4COSAs6IUhE/gviz/tq?tqx=out:csv', { responseType: 'stream' });
  data.data.pipe(
    parse({
      delimiter: ',',
      columns: true,
      ltrim: true,
    }),
  ).on('data', (row) => {
    dat.push(row);
  }).on('error', (error) => {
    console.log(error.message);
  }).on('end', async () => {
    console.log('parsed csv data:');
    // console.log(dat);
    await populate(dat);
  });
};

module.exports = { updateRatingsAndScores, populate, fetchData };
