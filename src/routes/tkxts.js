// src/routes/tkxts.js — TKXTS management routes
const router = require('express').Router();
const { Event } = require('../models/event');
const { TicketPurchase } = require('../models/ticketPurchase');
const { loginRequired } = require('../middlewares/auth');

/* GET /api/tkxts/user/:userId/tickets — user's purchased tickets */
router.get('/user/:userId/tickets', loginRequired, async (req, res) => {
    try {
        const purchases = await TicketPurchase.find({ userId: req.params.userId, status: 'confirmed' })
            .populate('eventId', 'title date location coverImage')
            .sort({ createdAt: -1 });
        res.json(purchases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET /api/tkxts/user/:userId/events — events created by user with stats */
router.get('/user/:userId/events', loginRequired, async (req, res) => {
    try {
        const events = await Event.find({ creator: req.params.userId }).sort({ date: -1 });
        const result = events.map(ev => {
            const totalTickets = ev.tickets.reduce((s, t) => s + t.quantity, 0);
            const ticketsSold = ev.tickets.reduce((s, t) => s + (t.sold || 0), 0);
            return { ...ev.toObject(), stats: { totalTickets, ticketsSold } };
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET /api/tkxts/events/:id/dashboard */
router.get('/events/:id/dashboard', loginRequired, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        const totalTickets = event.tickets.reduce((s, t) => s + t.quantity, 0);
        const ticketsSold = event.tickets.reduce((s, t) => s + (t.sold || 0), 0);
        const revenue = await TicketPurchase.aggregate([
            { $match: { eventId: event._id, status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$totalPaid' } } }
        ]);
        res.json({ totalTickets, ticketsSold, checkedIn: 0, revenue: revenue[0]?.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET /api/tickets/user/:userId — alias */
router.get('/tickets/user/:userId', loginRequired, async (req, res) => {
    try {
        const purchases = await TicketPurchase.find({ userId: req.params.userId, status: 'confirmed' })
            .populate('eventId', 'title date location coverImage')
            .sort({ createdAt: -1 });
        res.json(purchases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

exports.tkxtsRouter = router;
