const router = require('express').Router();
const controller = require('../controllers/routine');
const { loginRequired } = require('../middlewares/auth');

router.post('/generate', loginRequired, controller.generate_routine);
router.get('/current', loginRequired, controller.get_current_routine);
router.get('/today', loginRequired, controller.get_today);

exports.routineRouter = router;
