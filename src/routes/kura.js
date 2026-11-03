const router = require('express').Router();
const controller = require('../controllers/kura');
const { loginRequired } = require('../middlewares/auth');

router.get('/daily-state', loginRequired, controller.daily_state);

exports.kuraRouter = router;
