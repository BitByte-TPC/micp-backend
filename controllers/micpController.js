const axios = require('axios');
const Micp = require('../models/micp');
const { updateRatingsAndScores, fetchData } = require('../scrap');

exports.getRankList = async (req, res) => {
  const users = await Micp.find({}, '_id email score name codeChefId codeForcesId ccCurrentRating cfCurrentRating').sort({ score: -1});

  // console.log(users);
  res.status(200).json({
    status: true,
    users,
  });
};

exports.refreshRankList = async (req, res) => {
  await fetchData();
  await updateRatingsAndScores();
  try {
    await axios.post(process.env.HOOK_URL);
    console.log('build triggered');
  } catch (err) {
    console.log(err);
  }
  res.status(200).json({
    status: true,
    message: 'Refreshed',
  });
};
