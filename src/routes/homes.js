// src/routes/homes.js — standing in someone else's base
//
// LUCID_JUNGLES_COMPETITIVE_ANALYSIS.md §7 #1/#5: "visit a base" is the single
// highest-value pattern to take, and it is served by GET /api/homes/u/:username.
//
// Distinct from src/routes/home.js (singular), which is the *owner's* CRUD over
// their own base. This router is the public read that turns a base into a social
// object: whose it is, what is in it, and how many people have stood in it.
const router = require('express').Router();
const { User } = require('../models/user');
const { HomeBase } = require('../models/homeBase');
const { Visit } = require('../models/visit');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');

// Explicit allow-list of what a stranger standing in your base may see. Email,
// password, recoveryToken and refToken must never leave the database on a public
// route, so this is an allow-list rather than a `-password` exclusion: a field
// added to the User model later is private by default until someone opts it in.
const PUBLIC_OWNER_FIELDS = [
  'username', 'level', 'xp', 'profile_picture', 'about', 'location',
  'loginStreak', 'number_of_followers', 'user_type', 'artist_name', 'createdAt',
].join(' ');

const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

// A machine-readable code travels with the 404 so clients never have to match on
// English copy. eng.json currently renders USER_NOT_FOUND as an email-specific
// sentence, so string-matching the message is not something a client can rely on.
const notFound = (res) => sendErrorResponse(res, 'USER_NOT_FOUND', { code: 'USER_NOT_FOUND' }, 404);

// GET /api/homes/u/:username — the public read of a user's base.
// Works logged-out; when a session is present we also report whether *you* have
// already been here today, which is what stops the knock from spamming.
router.get('/u/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();
    if (!username) return notFound(res);

    const owner = await User.findOne({ username }).select(PUBLIC_OWNER_FIELDS).lean();
    if (!owner) return notFound(res);

    // req.session.user is a bare id (utils/session.js) and may be absent on this
    // public route — it is only used to personalise the response, never to gate it.
    const viewerId = req.session.user || null;
    const isSelf = Boolean(viewerId) && String(viewerId) === String(owner._id);

    const [home, total, uniqueVisitorIds, visitedToday] = await Promise.all([
      HomeBase.findOne({ userId: owner._id }).lean(),
      Visit.countDocuments({ hostId: owner._id }),
      Visit.distinct('visitorId', { hostId: owner._id }),
      viewerId ? Visit.countDocuments({ hostId: owner._id, visitorId: viewerId, day: utcDay() }) : 0,
    ]);

    return sendSuccessResponse(res, 'HOME_FETCHED', {
      owner,
      home: home || null,
      visits: {
        total,
        unique: uniqueVisitorIds.length,
        visitedByYouToday: Boolean(visitedToday),
      },
      isSelf,
    });
  } catch (err) {
    return sendErrorResponse(res, 'HOME_FETCH_ERROR', { error: err.message }, 500);
  }
});

exports.homesRouter = router;
