
const router = require('express').Router();

const controller = require('../controllers/hunt');

const { loginRequired, destroySession } = require('../middlewares/auth');
router.post('/hunt', controller.postHunt)


router.get('/clues', controller.getClues)

router.post('/user_reward',controller.getuser_reward)
router.post('/gethint', controller.getHint)
router.post('/secondhunt', controller.startsecondhunt)
router.post('/endhunt',controller.endhunt)
router.post('/leaderboard',controller.leaderboard)
router.post('/keyboard',controller.postkey)
router.post('/huntstatus',controller.gethuntstatus)
exports.huntRouter = router;