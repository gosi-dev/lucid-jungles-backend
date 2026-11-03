// src/routes/tickets.js — the public ticket contract
//
// The documented purchase path (LUCID_JUNGLES_BUILD_SPEC.md §727) is
// POST /api/tickets/buy. The handler has always lived at
// POST /api/events/tickets/buy, which is why the checkout page — the only
// client that follows the documented path — could never complete a purchase.
//
// This router restores the documented contract instead of rewriting every
// client to match the backend's internal route layout. The controller is
// deliberately shared with the /api/events alias: a single implementation, so
// the two paths cannot drift apart or diverge on authorisation.
const router = require('express').Router();
const controller = require('../controllers/events');
const { loginRequired } = require('../middlewares/auth');

router.post('/buy', loginRequired, controller.buy_tickets_v2);

// Simulated payment confirmation — DEVELOPMENT ONLY (the controller 404s in
// production). Real payments are confirmed by POST /api/events/validate-payment once
// Flutterwave has verified the transaction. This exists so the purchase flow can be
// exercised end to end — design review, offline work — without a provider round-trip.
router.post('/mock-confirm', loginRequired, controller.mock_confirm_payment);

// One purchase, for the ticket detail screen the receipt links to.
router.get('/:purchaseId', loginRequired, controller.get_purchase);

exports.ticketsRouter = router;
