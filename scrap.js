const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse');
const Micp = require('./models/micp');

// Function to get the CodeChef rating for a user
const getCodeChefRating = async (codeChefId) => {
  const response = await axios.get(`https://www.codechef.com/users/${codeChefId}`);
  const $ = cheerio.load(response.data);
  const rating = parseInt($('.rating-number')?.text() || '0', 10);
  return rating;
};

// Function to get the CodeForces rating for a user
const getCodeForcesRating = async (codeForcesId) => {
  const response = await axios.get(`https://codeforces.com/api/user.info?handles=${codeForcesId}`);
  const rating = response.data.result[0].rating;
  return rating;
};

const getNormalizedRating = async (codeChefId, codeForcesId) => {
  let codeChefRating = 0;
  let codeForcesRating = 0;
  try {
    codeChefRating = await getCodeChefRating(codeChefId);
  } catch (err) {
    console.log(err);
  }
  try {
    codeForcesRating = await getCodeForcesRating(codeForcesId);
  } catch (err) {
    console.log(err);
  }
  // Normalize the CodeChef rating by multiplying it by 0.8315
  codeChefRating = codeChefRating * 0.8315620555789324;
  return Math.max(codeChefRating, codeForcesRating);
};

// To populate the database with initial rating and score of new users
const populate = async (dat) => {
  const micpPromises = [];

  dat.forEach((user) => {
    const id = user['Codechef Username (Only username, not the link and no stars)'];
    // console.log(id);
    const promise = new Promise(async (resolve, reject) => {
      const response = await Micp.findOne({ username: id });
      resolve({ user, response });
    });
    micpPromises.push(promise);
  });

  const ratingPromises = [];
  await Promise.all(micpPromises).then((data) => {
    data.forEach((item) => {
      const { response, user } = item;
      if (response === null) {
        const url = `https://www.codechef.com/users/${user['Codechef Username (Only username, not the link and no stars)']}`;
        const promise = new Promise(async (resolve, reject) => {
          const resp = await axios.get(url);
          resolve({
            user,
            response: resp,
          });
        });
        ratingPromises.push(promise);
      }
    });
  });

  const newUsersPromises = [];
  await Promise.all(ratingPromises).then((data) => {
    data.forEach((item) => {
      const { user, response } = item;
      try {
        const $ = cheerio.load(response.data);
        const rating = parseInt($('.rating-number')?.text() || '0', 10);

        const newUser = new Micp({
          username: user['Codechef Username (Only username, not the link and no stars)'],
          name: user.Name,
          currentRating: rating,
          initialRating: rating,
          score: 0,
        });
        const promise = new Promise(async (resolve, reject) => {
          try {
            await newUser.save();
            resolve('Done');
          } catch (err) {
            console.log(err);
            reject(Error('Error saving user'));
          }
        });
        newUsersPromises.push(promise);
      } catch (err) {
        console.log('Username is invalid');
        console.log(err.message);
      }
    });
  });

  await Promise.all(newUsersPromises).then(() => {}).catch((err) => {
    console.log(err);
  });
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
        user.score = rating - user.initialRating;
        user.currentRating = rating;
        if (user.score < 0) user.score = 0;
        await user.save();
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
