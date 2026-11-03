// importing the required modules
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
// const repository = require('../repositories/user');

const isProduction = process.env.NODE_ENV === 'production';

//express session
const mongoStore = MongoStore.create({ mongoUrl: process.env.DATABASE_URL });
// Absorb store-level errors so they don't crash the session middleware
mongoStore.on('error', (err) => {
  console.error('Session store error (non-fatal):', err.message || err);
});
// If MongoStore can't load a session (e.g. brief DB timeout), return an empty
// session instead of calling next(err) — keeps the request alive.
const _origGet = mongoStore.get.bind(mongoStore);
mongoStore.get = (sid, cb) => {
  _origGet(sid, (err, session) => {
    if (err) {
      console.error('Session load error (continuing with empty session):', err.message || err);
      return cb(null, null);
    }
    cb(null, session);
  });
};

exports.createSession = session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,

  // Cookie settings differ for local vs production
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
    domain: isProduction ? 'lucidjungles.io' : undefined, // Only set domain in production
    secure: isProduction, // Only secure in production
    sameSite: isProduction ? 'strict' : 'lax', // Lax for local, strict for prod
    httpOnly: true, // Always httpOnly for security
  },
  store: mongoStore,
});



// session initializer
exports.initializeUserSession = (req, user) => {
  req.session.user = user._id;
};
