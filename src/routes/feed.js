const router = require('express').Router();
const { Post } = require('../models/post');
const { Comment } = require('../models/comment');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const { loginRequired } = require('../middlewares/auth');

// GET /api/feed?communityId=&limit= — social feed, newest first
router.get('/', async (req, res) => {
  try {
    const { communityId, limit = 20 } = req.query;
    const filter = communityId ? { communityId } : {};
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100))
      .populate('userId', 'username first_name last_name profile_picture')
      .populate('communityId', 'name cover_image')
      .lean();
    return sendSuccessResponse(res, 'FEED_FETCHED', posts);
  } catch (err) {
    return sendErrorResponse(res, 'FEED_FETCH_ERROR', { error: err.message }, 500);
  }
});

// POST /api/feed — create a post
router.post('/', loginRequired, async (req, res) => {
  try {
    const { content, communityId, type = 'status', mediaUrl } = req.body;
    if (!content && !mediaUrl) return sendErrorResponse(res, 'POST_CONTENT_REQUIRED', {}, 400);
    const post = await Post.create({ userId: req.user._id, communityId, content, type, mediaUrl });
    return sendSuccessResponse(res, 'POST_CREATED', post, 201);
  } catch (err) {
    return sendErrorResponse(res, 'POST_CREATE_ERROR', { error: err.message }, 500);
  }
});

// GET /api/feed/:postId/comments
router.get('/:postId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: 1 })
      .populate('userId', 'username profile_picture')
      .lean();
    return sendSuccessResponse(res, 'COMMENTS_FETCHED', comments);
  } catch (err) {
    return sendErrorResponse(res, 'COMMENTS_FETCH_ERROR', { error: err.message }, 500);
  }
});

// POST /api/feed/:postId/comments
router.post('/:postId/comments', loginRequired, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return sendErrorResponse(res, 'COMMENT_CONTENT_REQUIRED', {}, 400);
    const comment = await Comment.create({ postId: req.params.postId, userId: req.user._id, content });
    return sendSuccessResponse(res, 'COMMENT_CREATED', comment, 201);
  } catch (err) {
    return sendErrorResponse(res, 'COMMENT_CREATE_ERROR', { error: err.message }, 500);
  }
});

exports.feedRouter = router;
