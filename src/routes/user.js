const router = require('express').Router();

const {
  validateLoginPayload,
  validateRegisterPayload,
  validateUpdateProfilePayload,
  validateUpdatePasswordPayload,
  validateRecoverPasswordPayload,
  validateResetPasswordPayload,
} = require('../middlewares/validators/user');

const { loginRequired, destroySession } = require('../middlewares/auth');

const controller = require('../controllers/user');

router.post('/check-username', controller.checkUsernameAvailability);

router.post('/register', validateRegisterPayload, controller.registerUser);
router.post('/login', validateLoginPayload, controller.loginUser);
router.post('/logout', loginRequired, destroySession, controller.logoutUser);
router.get('/profile', loginRequired, controller.getUserProfile);
router.put(
  '/profile/update',
  loginRequired,
  validateUpdateProfilePayload,
  controller.updateUserProfile
);
router.put(
  '/password/update',
  loginRequired,
  validateUpdatePasswordPayload,
  controller.updateUserPassword
);
router.post(
  '/password/recover',
  validateRecoverPasswordPayload,
  controller.recoverUserPassword
);
router.post(
  '/password/reset',
  validateResetPasswordPayload,
  controller.resetUserPassword
);

router.post('/profile/verify', controller.Verifyuser)

router.get('/:id/verify/:user_token', controller.verifytoken)
router.get('/profile/referrals', controller.getref)
router.get('/u/:username', controller.getPublicProfile)
exports.userRouter = router;
