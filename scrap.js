const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse');
const Micp = require('./models/micp');

// Function to get the CodeChef rating of a user
const getCodeChefRating = async (codeChefId) => {
  const response = await axios.get(`https://www.codechef.com/users/${codeChefId}`);
  const $ = cheerio.load(response.data);
  const rating = parseInt($('.rating-number')?.text() || '0', 10);
  return rating;
};

// Function to get the CodeForces rating of a user
const getCodeForcesRating = async (codeForcesId) => {
  const response = await axios.get(`https://codeforces.com/profile/${codeForcesId}`);
  const $ = cheerio.load(response.data);
  const rating = $('#pageContent div.info li span').first().text();
  return rating;
};

const getScore = (ccInitial, ccCurrent, cfInitial, cfCurrent) => {
  const deltaCC = (ccCurrent - ccInitial)*0.8315620555789324;
  const deltaCF = cfCurrent - cfInitial;
  // Normalize the CodeChef rating by multiplying it by 0.8315
  return Math.max(deltaCC, deltaCF);
};

// To populate the database with initial rating and score of new users
const populate = async (dat) => {
  const micpPromises = [];
  dat.forEach((user) => {
    const email = user['Email Address']
    const promise = new Promise(async (resolve, reject) => {
      const response = await Micp.findOne({ email: email });
      resolve({ user, response });
    });
    micpPromises.push(promise);
  });

  const ratingPromises = [];
  await Promise.allSettled(micpPromises).then((data) => {
    data.forEach((item) => {
      // console.log(item)
      const { response, user } = item.value;
      if (response === null) {
        const codeChefId = user['Codechef Username (Only username, not the link and no stars)'];
        const codeForcesId = user['Codeforces Username (Only username, not the link)'];
        // console.log(codeChefId, codeForcesId)
        const promise = new Promise(async (resolve, reject) => {
          try {
            const ccInitialRating = await getCodeChefRating(codeChefId);
            const cfInitialRating = await getCodeForcesRating(codeForcesId);
            // console.log(user)
            resolve({
              user: user,
              codeChefId: codeChefId,
              codeForcesId: codeForcesId,
              ccInitialRating: ccInitialRating,
              cfInitialRating: cfInitialRating,
            });
          } catch (err) {
            console.log(err);
            reject(Error('Error getting rating'));
          }
        });
        ratingPromises.push(promise)
      }
    })
  })
  // console.log(ratingPromises)
  const newUsersPromises = [];
  await Promise.allSettled(ratingPromises).then((data) => {
    data.forEach((item) => {
      // console.log(item)
      const {
        user,
        codeChefId,
        codeForcesId,
        ccInitialRating,
        cfInitialRating,
      } = item.value;
      // console.log(user)

      const newUser = new Micp({
        email: user['Email Address'],
        codeChefId: codeChefId,
        codeForcesId: codeForcesId,
        ccCurrentRating: ccInitialRating,
        ccInitialRating: ccInitialRating,
        cfCurrentRating: cfInitialRating,
        cfInitialRating: cfInitialRating,
        score: 0,
        name: user.Name,
      });
      const promise = new Promise(async (resolve, reject) => {
        try {
          await newUser.save();
          resolve("Done");
        } catch (err) {
          console.log(err);
          reject(Error("Error saving user"));
        }
      });
      newUsersPromises.push(promise);
    });
  });
  // console.log(newUsersPromises)

  await Promise.all(newUsersPromises)
    .then(() => {})
    .catch((err) => {
      console.log(err);
    });
  console.log("Data populated");
};

// cron job to update the score of users every 24 hours
const updateRatingsAndScores = async () => {
  const users = await Micp.find() || [];
  const promises = [];
  try {
    users.forEach((user) => {
      const promise = new Promise(async (resolve, reject) => {
        try {
          // Get the normalized score for the user
          user.ccCurrentRating = await getCodeChefRating(user.codeChefId)
          user.cfCurrentRating = await getCodeForcesRating(user.codeForcesId)
          const score = getScore(user.ccInitialRating, user.ccCurrentRating , user.cfInitialRating, user.cfCurrentRating)
          user.score = score
          await user.save();
          resolve('Done');
        } catch (err) {
          console.log(err);
          reject(Error('Error updating rating'));
        }
      });
      promises.push(promise);
    });
  } catch (err) {
    console.log(err);
  }
  await Promise.allSettled(promises).then(() => {
    console.log('Ratings updated');
  }).catch((err) => {
    console.log(err);
  });
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
