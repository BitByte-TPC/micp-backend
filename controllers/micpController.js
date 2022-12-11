const Micp = require("../models/micp");
const {populate, updateRatingsAndScores} = require("../scrap");

exports.getRankList = async (req, res) => {
    const users = await Micp.find({}, '_id username score currentRating name').sort({ score: -1, currentRating: -1 });

    // console.log(users);
    res.status(200).json({
        status: true,
        users
    });
};

exports.refreshRankList = async (req, res) => {
    await populate();
    await updateRatingsAndScores();

    // console.log(users);
    res.status(200).json({
        status: true,
        message: "Refreshed"
    });
}
