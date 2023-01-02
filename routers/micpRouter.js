const router = require('express').Router();
const micpController = require('../controllers/micpController');

router.get('/rankList', micpController.getRankList);
router.get('/refreshRankList', (req, res, next) => {
  try {
    if (process.env.TOKEN && req.query.token === process.env.TOKEN) {
      next();
    } else {
      res.status(401)
        .json({ message: 'Wrong token used' });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      status: false,
      message: e.message,
    });
  }
}, micpController.refreshRankList);

module.exports = router;
