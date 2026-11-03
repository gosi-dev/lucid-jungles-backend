const router = require('express').Router();
const { Mission } = require('../models/mission');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { loginRequired } = require('../middlewares/auth');

// GET /api/quests — current user's missions (daily/weekly/monthly)
router.get('/', loginRequired, async (req, res) => {
  try {
    const missions = await Mission.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    return sendSuccessResponse(res, 'QUESTS_FETCHED', missions);
  } catch (err) {
    return sendErrorResponse(res, 'QUESTS_FETCH_ERROR', { error: err.message }, 500);
  }
});

// POST /api/quests — create a mission
router.post('/', loginRequired, async (req, res) => {
  try {
    const { title, description, type = 'daily', goal = 1, reward } = req.body;
    if (!title) return sendErrorResponse(res, 'QUEST_TITLE_REQUIRED', {}, 400);
    const mission = await Mission.create({
      userId: req.user._id, title, description, type, goal, reward,
    });
    return sendSuccessResponse(res, 'QUEST_CREATED', mission, 201);
  } catch (err) {
    return sendErrorResponse(res, 'QUEST_CREATE_ERROR', { error: err.message }, 500);
  }
});

// PATCH /api/quests/:missionId/progress — advance a mission (auto-completes at goal)
router.patch('/:missionId/progress', loginRequired, async (req, res) => {
  try {
    const { progress } = req.body;
    const mission = await Mission.findOneAndUpdate(
      { _id: req.params.missionId, userId: req.user._id },
      { $inc: { progress: Number(progress) || 1 } },
      { new: true }
    );
    if (!mission) return sendErrorResponse(res, 'QUEST_NOT_FOUND', {}, 404);
    if (mission.progress >= mission.goal && mission.status === 'active') {
      mission.status = 'completed';
      await mission.save();
    }
    return sendSuccessResponse(res, 'QUEST_PROGRESS_UPDATED', mission);
  } catch (err) {
    return sendErrorResponse(res, 'QUEST_PROGRESS_ERROR', { error: err.message }, 500);
  }
});

exports.questsRouter = router;
