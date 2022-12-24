const axios = require("axios");
const cheerio = require("cheerio");
const Micp = require("./models/micp");
const {parse} = require('csv-parse');
const getRating = async (username) => {
    const url = `https://www.codechef.com/users/${username}`;
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const rating = $(".rating-number")?.text() || "";
        if (rating === "") return false;
        return parseInt(rating);
    } catch (err) {
        console.log(err.message);
        return false;
    }
};

// To populate the database with initial rating and score of new users

const populate = async (dat) => {
    let micpPromises = [];
    for (const user of dat) {
        const id = user["ID"];
        micpPromises.push(Micp.findOne({username: id}).lean().exec());
    }

    micpPromises = await Promise.all(micpPromises)
    let ratingPromises = [];
    let filteredUsers = [];
    for (let i = 0; i < micpPromises.length; i++) {
        if (micpPromises[i] === null) {
            let user = dat[i];
            filteredUsers.push(user);
            const id = user["ID"];
            ratingPromises.push(getRating(id));
        }
    }
    ratingPromises = await Promise.all(ratingPromises);

    let promises = [];
    for (let i = 0; i < filteredUsers.length; i++) {
        let user = filteredUsers[i];
        const id = user["ID"];
        const name = user["Name"];
        const rating = ratingPromises[i];
        if (rating) {
            const newUser = new Micp({
                username: id,
                name: name,
                currentRating: rating,
                initialRating: rating,
                score: rating
            });
            promises.push(newUser.save());
        }
    }
    await Promise.all(promises);
    console.log("Data populated");
}

// cron job to update the score of users every 24 hours
const updateRatingsAndScores = async () => {
    const users = await Micp.find() || [];
    let promises = [];
    try {
        users.forEach((user) => {
            const url = `https://www.codechef.com/users/${user.username}`;
            let promise = new Promise(async (resolve) => {
                let response = await axios.get(url)
                resolve({
                    user: user,
                    response: response
                })
            })
            promises.push(promise)
        });
        await Promise.all(promises).then((data) => {
            data.forEach(async (item) => {
                let user = item.user;
                let $ = cheerio.load(item.response.data);
                let rating = parseInt($(".rating-number")?.text() || "0");
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
            })
        });
    } catch (err) {
        console.log(err.status);
    }
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
    }).on("end", async function () {
        console.log("parsed csv data:");
        // console.log(dat);
        await populate(dat)
    });

}

module.exports = {updateRatingsAndScores, populate, fetchData}
