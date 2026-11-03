const router = require('express').Router();
const { HomeBase } = require('../models/homeBase');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { loginRequired } = require('../middlewares/auth');

// GET /api/home/:userId — read a user's base (TECHNICAL_ARCHITECTURE.md contract)
router.get('/:userId', async (req, res) => {
  try {
    const home = await HomeBase.findOne({ userId: req.params.userId }).lean();
    if (!home) return sendErrorResponse(res, 'HOME_NOT_FOUND', {}, 404);
    return sendSuccessResponse(res, 'HOME_FETCHED', home);
  } catch (err) {
    return sendErrorResponse(res, 'HOME_FETCH_ERROR', { error: err.message }, 500);
  }
});

// POST /api/home — create (or upsert) the current user's base
router.post('/', loginRequired, async (req, res) => {
  try {
    const home = await HomeBase.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, userId: req.user._id, lastUpdatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return sendSuccessResponse(res, 'HOME_SAVED', home, 201);
  } catch (err) {
    return sendErrorResponse(res, 'HOME_SAVE_ERROR', { error: err.message }, 500);
  }
});

// PUT /api/home — update the current user's base
router.put('/', loginRequired, async (req, res) => {
  try {
    const home = await HomeBase.findOneAndUpdate(
      { userId: req.user._id },
      { ...req.body, lastUpdatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return sendSuccessResponse(res, 'HOME_UPDATED', home);
  } catch (err) {
    return sendErrorResponse(res, 'HOME_UPDATE_ERROR', { error: err.message }, 500);
  }
});

exports.homeRouter = router;
