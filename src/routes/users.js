const router = require('express').Router();
const { User } = require('../models/user');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');

// GET /api/users/:id — public profile by id (TECHNICAL_ARCHITECTURE.md contract)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -recoveryToken -refToken')
      .lean();
    if (!user) return sendErrorResponse(res, 'USER_PROFILE_NOT_FOUND', {}, 404);
    return sendSuccessResponse(res, 'USER_FETCHED', user);
  } catch (err) {
    return sendErrorResponse(res, 'USER_FETCH_ERROR', { error: err.message }, 500);
  }
});

exports.usersRouter = router;
