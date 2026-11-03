const router = require('express').Router();
const { uploadAvatar } = require('../middlewares/utils/upload');
const { loginRequired } = require('../middlewares/auth');
const { validateUploadAvatarPayload } = require('../middlewares/avatar');

const controller = require('../controllers/avatar');

router.post(
  '/upload',
  loginRequired,
  uploadAvatar,
  validateUploadAvatarPayload,
  controller.uploadUserAvatar
);
router.get('/view', loginRequired, controller.getUserAvatar);
router.post('/save', loginRequired, controller.saveUserAvatar);

router.post('/useravatar', loginRequired,controller.createAvatar)

router.put('/updateavatar',loginRequired,controller.updateAvatar)

exports.avatarRouter = router;
