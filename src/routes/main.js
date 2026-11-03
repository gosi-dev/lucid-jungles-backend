const router = require('express').Router();

const controller = require('../controllers/main');
const { loginRequired } = require('../middlewares/auth');
const { uploadhandler } = require('../utils/uploads');

router.get('/users', controller.retrieveAllUsers);
router.get('/leaderboard', controller.leaderboard)
router.post('/upload-media',loginRequired, uploadhandler.any("media"),  controller.uploadmedia)
router.post('/store_dream_items', loginRequired, controller.collect_items)
router.post('/update_xp', loginRequired,controller.update_experience_points)
exports.mainRouter = router;
