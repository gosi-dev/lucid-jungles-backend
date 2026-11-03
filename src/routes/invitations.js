// src/routes/invitations.js — Invitation management
const router = require('express').Router();
const { Event } = require('../models/event');
const { v4: uuidv4 } = require('uuid');
const { loginRequired } = require('../middlewares/auth');

/* POST /api/invitations — create invitation link */
router.post('/', loginRequired, async (req, res) => {
    try {
        const { eventId, type, message } = req.body;
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        // req.session.user holds a bare id (utils/session.js); loginRequired puts the
        // resolved document on req.user, so read the id from there.
        const viewerId = req.user?._id || req.session.user;
        if (String(event.creator) !== String(viewerId)) {
            return res.status(403).json({ error: 'Not authorised' });
        }
        const inviteId = uuidv4();
        event.invitations.push({ inviteId, type: type || 'attendee', status: 'active', createdAt: new Date() });
        await event.save();
        res.json({ inviteId, type, eventId, eventName: event.title });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* GET /api/invitations/:inviteId — look up invitation */
router.get('/:inviteId', async (req, res) => {
    try {
        const event = await Event.findOne({ 'invitations.inviteId': req.params.inviteId });
        if (!event) return res.status(404).json({ error: 'Invitation not found' });
        const inv = event.invitations.find(i => i.inviteId === req.params.inviteId);
        if (!inv || inv.status !== 'active') return res.status(404).json({ error: 'Invitation expired or not found' });
        res.json({ data: { inviteId: inv.inviteId, type: inv.type, eventId: event._id, eventName: event.title } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* POST /api/invitations/:inviteId/respond — submit talent/vendor application */
router.post('/:inviteId/respond', async (req, res) => {
    try {
        const event = await Event.findOne({ 'invitations.inviteId': req.params.inviteId });
        if (!event) return res.status(404).json({ error: 'Invitation not found' });
        const inv = event.invitations.find(i => i.inviteId === req.params.inviteId);
        if (!inv || inv.status !== 'active') return res.status(400).json({ error: 'Invitation expired' });

        const applicant = { ...req.body, appliedAt: new Date() };
        const type = inv.type || req.body.type;

        if (type === 'talent') {
            if (!event.talents) event.talents = [];
            event.talents.push({ name: req.body.name, role: req.body.role, bio: req.body.bio, email: req.body.email, socialLinks: req.body.socialLinks });
        } else if (type === 'vendor') {
            if (!event.exhibitors) event.exhibitors = [];
            // `email` is collected by pages/invitation/[inviteId]/vendor/form.js and was
            // being discarded here (and had no path in the Event schema), which left the
            // exhibitor profile with no way to be contacted.
            event.exhibitors.push({ name: req.body.company || req.body.name, description: req.body.description, services: req.body.services, website: req.body.website, email: req.body.email });
        }

        await event.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

exports.invitationsRouter = router;
