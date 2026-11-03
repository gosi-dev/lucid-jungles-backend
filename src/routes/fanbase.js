
const router = require('express').Router();

const controller = require('../controllers/fanbase');
const { loginRequired, destroySession } = require('../middlewares/auth');


router.post("/create", loginRequired, controller.create_fanbase)
router.post("/:fanbaseId/add_map", loginRequired, controller.add_fanbase_map)
router.post("/:fanbaseId/create_goal", loginRequired, controller.create_community_goal)
router.get("/:fanbaseId/fetch", loginRequired, controller.fetch_fanbase)
router.get("/fetch_all", loginRequired, controller.fectch_all_fanbase)
router.post("/join", loginRequired, controller.join_fanbase)
router.post("/validate-payment", loginRequired, controller.validate_fanbase_payment)
router.post("/:fanbaseId/onboarding", loginRequired, controller.complete_onboarding)
router.get("/my-dojo", loginRequired, controller.my_dojo)




exports.fanbaseRouter = router;