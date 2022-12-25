const axios = require('axios');
const Micp = require('../models/micp');
const { updateRatingsAndScores, fetchData } = require('../scrap');

exports.getRankList = async (req, res) => {
  const users = await Micp.find({}, '_id username score currentRating name').sort({ score: -1, currentRating: -1 });

  // console.log(users);
  res.status(200).json({
    status: true,
    users,
  });
};

exports.refreshRankList = async (req, res) => {
  await fetchData();
  await updateRatingsAndScores();
  const response = await axios.get(`https://micp.netlify.app/api/revalidate?secret=${process.env.REVALIDATE_TOKEN}`).catch((err) => {
    console.log(err.message);
  });
  if (response?.data?.revalidated) console.log('Cache updated');
  else console.log('Error occured while updating cache');
  res.status(200).json({
    status: true,
    message: 'Refreshed',
  });
};
