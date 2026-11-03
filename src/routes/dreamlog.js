const router = require('express').Router();
const controller = require('../controllers/dreamlog');
const { loginRequired } = require('../middlewares/auth');

router.post('/', loginRequired, controller.create_entry);
router.get('/', loginRequired, controller.get_my_entries);
router.get('/public/:userId', controller.get_public_entries);
router.patch('/:entryId', loginRequired, controller.update_entry);
router.delete('/:entryId', loginRequired, controller.delete_entry);

exports.dreamlogRouter = router;
