// src/routes/visit.js — POST /api/visit
//
// LUCID_JUNGLES_COMPETITIVE_ANALYSIS.md §7 #1. Standing in a base is a *social
// act*, not a page view: it is recorded so the base can show how many people
// have been to it. One visit per visitor per host per day (enforced by a unique
// index on the Visit model), so this endpoint is safe to call on every mount.
const router = require('express').Router();
const { User } = require('../models/user');
const { Visit } = require('../models/visit');
const { loginRequired } = require('../middlewares/auth');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');

const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);
const DUPLICATE_KEY = 11000;

// POST /api/visit — record that the logged-in user stood in someone's base.
// Body: { username }
router.post('/', loginRequired, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    if (!username) return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 400);

    const host = await User.findOne({ username }).select('_id username').lean();
    if (!host) return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);

    // You are not a visitor in your own base. Counting yourself would make every
    // base look inhabited, and the number would mean nothing.
    if (String(host._id) === String(req.user._id)) {
      return sendSuccessResponse(res, 'VISIT_SELF', {
        isSelf: true,
        firstVisitToday: false,
        visits: { total: 0, unique: 0 },
      });
    }

    const day = utcDay();
    let firstVisitToday = false;

    try {
      await Visit.create({ hostId: host._id, visitorId: req.user._id, day });
      firstVisitToday = true;
    } catch (err) {
      // Duplicate key means "you already stood here today" — the expected path,
      // not an error. Anything else is a genuine failure.
      if (err.code !== DUPLICATE_KEY) throw err;
    }

    const [total, uniqueVisitorIds] = await Promise.all([
      Visit.countDocuments({ hostId: host._id }),
      Visit.distinct('visitorId', { hostId: host._id }),
    ]);

    return sendSuccessResponse(res, 'VISIT_RECORDED', {
      isSelf: false,
      firstVisitToday,
      visits: { total, unique: uniqueVisitorIds.length },
    });
  } catch (err) {
    return sendErrorResponse(res, 'VISIT_ERROR', { error: err.message }, 500);
  }
});

exports.visitRouter = router;
