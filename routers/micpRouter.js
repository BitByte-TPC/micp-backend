const router = require('express').Router();
const micpController = require('../controllers/micpController');

router.get('/rankList', micpController.getRankList);
router.get('/refreshRankList', (req, res) => {
    if(req.query.token === process.env.TOKEN){
        micpController.refreshRankList()
    }else{
        res.status(401).json({message: 'Wrong token used'})
    }    
});

module.exports = router;
