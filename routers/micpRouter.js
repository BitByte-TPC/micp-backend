const router = require("express").Router();
const micpController = require("../controllers/micpController");

router.get("/rankList", micpController.getRankList);
router.get("/refreshRankList", micpController.refreshRankList);

module.exports = router;
