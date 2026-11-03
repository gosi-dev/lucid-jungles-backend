const { userRouter } = require('./user');
const { avatarRouter } = require('./avatar');
const { mainRouter } = require('./main');
const { huntRouter } = require('./hunt')
const { storeRouter } = require("./store");
const { fanbaseRouter } = require('./fanbase');
const { eventsRouter } = require('./events');
const { routineRouter } = require('./routine');
const { activityRouter } = require('./activity');
const { dreamlogRouter } = require('./dreamlog');
const { kuraRouter } = require('./kura');
const { mapRouter } = require('./map');
const { tkxtsRouter } = require('./tkxts');
const { ticketsRouter } = require('./tickets');
const { invitationsRouter } = require('./invitations');
// MVP contract additions (TECHNICAL_ARCHITECTURE.md / DATA_MODEL.md gaps)
const { authRouter } = require('./auth');
const { homeRouter } = require('./home');
const { homesRouter } = require('./homes');
const { visitRouter } = require('./visit');
const { feedRouter } = require('./feed');
const { chatRouter } = require('./chat');
const { questsRouter } = require('./quests');
const { usersRouter } = require('./users');
const index = (app) => {
  // Portfolio mounted in app.js before session middleware (offline-capable)

  app.use('/api/user', userRouter);
  app.use('/api/avatar', avatarRouter);
  app.use('/api/main', mainRouter);
  app.use('/api',huntRouter)
  app.use('/api/store', storeRouter)
  app.use('/api/fanbase', fanbaseRouter)
  app.use('/api/events', eventsRouter)
  app.use('/api/routine', routineRouter)
  app.use('/api/activity', activityRouter)
  app.use('/api/dreamlog', dreamlogRouter)
  app.use('/api/kura', kuraRouter)
  app.use('/api/map', mapRouter)
  app.use('/api/tkxts', tkxtsRouter)
  app.use('/api', tkxtsRouter)  // for /api/tickets/user/:userId
  // Documented public ticket contract (BUILD_SPEC §727). Mounted after tkxts so
  // the existing /api/tickets/user/:userId alias keeps its current owner and
  // only the previously-unclaimed /api/tickets/buy newly resolves.
  app.use('/api/tickets', ticketsRouter)
  app.use('/api/invitations', invitationsRouter)

  // MVP contract additions
  app.use('/api/auth', authRouter)   // POST /api/auth/signup | /api/auth/signin
  app.use('/api/users', usersRouter) // GET  /api/users/:id
  app.use('/api/home', homeRouter)   // GET/POST/PUT /api/home
  app.use('/api/homes', homesRouter) // GET  /api/homes/u/:username — visit a base
  app.use('/api/visit', visitRouter) // POST /api/visit — record standing in a base
  app.use('/api/feed', feedRouter)   // GET/POST /api/feed (+ comments)
  app.use('/api/chat', chatRouter)   // GET/POST /api/chat
  app.use('/api/quests', questsRouter) // GET/POST/PATCH /api/quests
};

exports.index = index;
