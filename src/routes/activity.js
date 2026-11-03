const router = require('express').Router();
const controller = require('../controllers/activity');
const { loginRequired } = require('../middlewares/auth');

router.post('/log', loginRequired, controller.log_activity);

exports.activityRouter = router;
