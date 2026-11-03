const router = require('express').Router();
const mongoose = require('mongoose');
const controller = require('../controllers/events');
const { loginRequired } = require('../middlewares/auth');

/* A malformed :id is not a server fault. Without this, /api/events/tickets (a URL anyone
   can type, and the one a static route collision produced) reached findById('tickets') and
   answered 500 with the raw Mongoose CastError. No document can match a non-id, so every
   :id route now answers 404. Registered once on the router so no handler can forget it. */
router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'Event not found' });
  }
  return next();
});

// Public
router.get('/', controller.list_events);
// Session-scoped, so it must precede '/:id' or the id route would swallow 'mine'.
router.get('/mine', loginRequired, controller.my_events);
// Alias for the handler mounted at /user/my-tickets below — the name this controller has
// always documented. It belongs above '/:id' for the same reason 'mine' does.
router.get('/my-tickets', loginRequired, controller.my_tickets);
router.get('/:id', controller.get_event);
router.get('/:id/tickets', controller.get_tickets);

// Auth required
router.post('/', loginRequired, controller.create_event);
router.put('/:id', loginRequired, controller.update_event);
router.post('/:id/buy', loginRequired, controller.buy_tickets);
router.post('/validate-payment', loginRequired, controller.validate_event_payment);
router.get('/user/my-tickets', loginRequired, controller.my_tickets);

// User-scoped endpoints
router.get('/user/:userId', loginRequired, controller.user_events);
// Historical alias. The documented public path is POST /api/tickets/buy
// (see routes/tickets.js, BUILD_SPEC §727). Both mount the same handler so they
// cannot drift or diverge on authorisation.
router.post('/tickets/buy', loginRequired, controller.buy_tickets_v2);
router.get('/:id/dashboard', loginRequired, controller.event_dashboard);

// Sessions
router.get('/:id/sessions', controller.get_sessions);
router.post('/:id/sessions', loginRequired, controller.create_session);

exports.eventsRouter = router;
