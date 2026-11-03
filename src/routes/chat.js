const router = require('express').Router();
const { Message } = require('../models/message');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { loginRequired } = require('../middlewares/auth');

// GET /api/chat — list the current user's threads (most recent first)
router.get('/', loginRequired, async (req, res) => {
  try {
    const userId = req.user._id;
    const threads = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$threadId',
          lastMessage: { $first: '$content' },
          updatedAt: { $first: '$createdAt' },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);
    return sendSuccessResponse(res, 'THREADS_FETCHED', threads);
  } catch (err) {
    return sendErrorResponse(res, 'THREADS_FETCH_ERROR', { error: err.message }, 500);
  }
});

// GET /api/chat/:threadId — messages in a thread
router.get('/:threadId', loginRequired, async (req, res) => {
  try {
    const messages = await Message.find({ threadId: req.params.threadId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username profile_picture')
      .lean();
    return sendSuccessResponse(res, 'MESSAGES_FETCHED', messages);
  } catch (err) {
    return sendErrorResponse(res, 'MESSAGES_FETCH_ERROR', { error: err.message }, 500);
  }
});

// POST /api/chat — send a message into a thread
router.post('/', loginRequired, async (req, res) => {
  try {
    const { receiverId, threadId, content } = req.body;
    if (!threadId || !content) return sendErrorResponse(res, 'THREAD_AND_CONTENT_REQUIRED', {}, 400);
    const message = await Message.create({ senderId: req.user._id, receiverId, threadId, content });
    return sendSuccessResponse(res, 'MESSAGE_SENT', message, 201);
  } catch (err) {
    return sendErrorResponse(res, 'MESSAGE_SEND_ERROR', { error: err.message }, 500);
  }
});

exports.chatRouter = router;
