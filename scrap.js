const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse');
const Micp = require('./models/micp');

// To populate the database with initial rating and score of new users

const populate = async (dat) => {
  let micpPromises = [];

  dat.forEach((user) => {
    const id = user.ID;
    let promise = new Promise(async (resolve, reject) => {
      const response = await Micp.findOne({ username: id })
      resolve({user, response})
    })
    micpPromises.push(promise);
  })

  let ratingPromises = [];
  await Promise.all(micpPromises).then((data) => {
    data.forEach((item) => {
      const { response, user } = item;
      if(response === null){
        const url = `https://www.codechef.com/users/${user.ID}`;
        let promise = new Promise(async (resolve, reject) => {
          let response = await axios.get(url);
          resolve({
            user,
            response,
          });
        })
        ratingPromises.push(promise)
      }
    })
  })

  let newUsersPromises = [];
  await Promise.all(ratingPromises).then((data) => {
    data.forEach((item) => {
      const { user, response } = item;
      try{
        const $ = cheerio.load(response.data);
        const rating = parseInt($('.rating-number')?.text() || '0');
        
        const newUser = new Micp({
          username: user.ID,
          name: user.Name,
          currentRating: rating,
          initialRating: rating,
          score: 0,
        });
        let promise = new Promise(async (resolve, reject) => {
          try{
            let response = await newUser.save()
            resolve("Done")
          }catch(err){
            console.log(err)
            reject("Error saving user")
          }
        })
        newUsersPromises.push(promise)
      
      }catch(err){
        console.log("Username is invalid")
        console.log(err.message);
      }
    })
  })

  await Promise.all(newUsersPromises).then((messages) => {}).catch((err) => {
    console.log(err)
  })
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
