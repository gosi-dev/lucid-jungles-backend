// Auth aliases — expose the documented /api/auth/signup|signin contract on top
// of the canonical user controller. routes/user.js (mounted at /api/user)
// remains the source of truth; this only adds the documented path names.
const router = require('express').Router();
const controller = require('../controllers/user');
const {
  validateLoginPayload,
  validateRegisterPayload,
} = require('../middlewares/validators/user');

router.post('/signup', validateRegisterPayload, controller.registerUser);
router.post('/signin', validateLoginPayload, controller.loginUser);

exports.authRouter = router;
