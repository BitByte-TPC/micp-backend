const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse');
const Micp = require('./models/micp');

// Function to get the CodeChef rating of a user
const getCodeChefRating = async (codeChefId) => {
  try {
    const response = await axios.get(`https://www.codechef.com/users/${codeChefId}`);
    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      try {
        const userName = $('.h2-style', 'header').text();
        if (userName) {
          const rating = parseInt($('.rating-number')?.text() || '0', 10);
          return rating;
        } else return -1
      } catch (err) {
        console.log(`Codechef: ${codeChefId} username not found`)
        return -1;
      }
    }
  } catch (err) {
    console.log(`Error in getting codechef rating of ${codeChefId}`)
    return -1;
  }

};

// Function to get the CodeForces rating of a user
const getCodeForcesRating = async (codeForcesId) => {
  const response = await axios.get(`https://codeforces.com/profile/${codeForcesId}`);
  const $ = cheerio.load(response.data);
  const rating = parseInt($('#pageContent div.info li span').first().text() || '0', 10);
  return rating;
};

const getScore = (ccInitial, ccCurrent, cfInitial, cfCurrent) => {
  const deltaCC = (ccCurrent - ccInitial) * 0.8315620555789324;
  const deltaCF = cfCurrent - cfInitial;

  // Normalize the CodeChef rating by multiplying it by 0.8315
  return parseInt(Math.max(deltaCC, deltaCF));
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

      const { response, user } = item.value;
      if (response === null) {
        const codeChefId = user['Codechef Username (Only username, not the link and no stars)'];
        const codeForcesId = user['Codeforces Username (Only username, not the link)'];

        const promise = new Promise(async (resolve, reject) => {
          try {
            const ccInitialRating = await getCodeChefRating(codeChefId);
            const cfInitialRating = await getCodeForcesRating(codeForcesId);
            if (ccInitialRating !== -1 && cfInitialRating !== -1) {
              resolve({
                user: user,
                codeChefId: codeChefId,
                codeForcesId: codeForcesId,
                ccInitialRating: ccInitialRating,
                cfInitialRating: cfInitialRating,
              });
            } else {
              reject(`Error in getting ratings for user ${user.Name}`)
            }
          } catch (err) {
            console.log(err);
            reject("Error in getting rating")
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
      try {
        const {
          user,
          codeChefId,
          codeForcesId,
          ccInitialRating,
          cfInitialRating,
        } = item.value;

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
      } catch (err) {
        console.log(err)
      }
    });
  });

  await Promise.all(newUsersPromises)
    .then(() => { })
    .catch((err) => {
      console.log(err);
    });
  console.log("Data populated");
};

// cron job to update the score of users every 24 hours
const updateRatingsAndScores = async () => {
  const users = await Micp.find({}) || [];
  const promises = [];
  try {
    users.forEach((user) => {
      const promise = new Promise(async (resolve, reject) => {
        try {
          // Get the normalized score for the user
          user.ccCurrentRating = await getCodeChefRating(user.codeChefId)
          user.cfCurrentRating = await getCodeForcesRating(user.codeForcesId)

          if (user.ccCurrentRating != -1 && user.cfCurrentRating != -1) {
            const score = getScore(user.ccInitialRating, user.ccCurrentRating, user.cfInitialRating, user.cfCurrentRating)
            user.score = score
            console.log(score)
            await user.save();
            resolve('Done');
          } else {
            reject(`Error in updating ratings of ${user.Name}`)
          }
        } catch (err) {
          console.log("Errors message on user save");
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
