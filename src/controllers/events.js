const { Event } = require('../models/event');
const { TicketPurchase } = require('../models/ticketPurchase');
const Flutterwave = require('flutterwave-node-v3');
const { v4: uuidv4 } = require('uuid');

// Lazy accessor — mirrors store.js pattern (env vars not available at require time in test env)
const getFlw = () => new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.SECRET_KEY);

/* ---------------------------------------------------
   Session identity

   utils/session.js stores `req.session.user` as a bare user id, so the
   `req.session.user._id` these handlers used to read was always undefined. The
   damage was quiet and total: creating an event failed with
   "creator: Path `creator` is required", buying a ticket wrote a purchase with no
   userId, and the creator checks rejected the event's actual owner.

   Every handler below sits behind loginRequired, which looks the id up and puts the
   full user document on req.user — that is the reliable source.
--------------------------------------------------- */
const sessionUserId = (req) => req.user?._id || req.session.user;
const sessionUser   = (req) => req.user || { _id: req.session.user };


/* ---------------------------------------------------
   GET /api/events — list all events
--------------------------------------------------- */
exports.list_events = async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/events/:id — single event with tickets
--------------------------------------------------- */
exports.get_event = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   POST /api/events — create event (auth required)
   Body: { title, date, location, description, tickets:[{name, price, currency, quantity}] }
--------------------------------------------------- */
exports.create_event = async (req, res) => {
    try {
        const { title, date, location, description, isVirtual, coverImage, latitude, longitude, fanbaseId, tickets, tags } = req.body;
        const event = new Event({
            creator: sessionUserId(req),
            fanbaseId: fanbaseId || null,
            title, date, location, description,
            isVirtual: !!isVirtual,
            coverImage: coverImage || null,
            latitude: latitude || null,
            longitude: longitude || null,
            tags: Array.isArray(tags) ? tags.slice(0, 3) : [],
            tickets: tickets || []
        });
        await event.save();
        res.status(201).json(event);
    } catch (err) {
        console.error('create_event error:', err);
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   PUT /api/events/:id — update event (creator only)
--------------------------------------------------- */
exports.update_event = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (String(event.creator) !== String(sessionUserId(req))) {
            return res.status(403).json({ error: 'Not the event creator' });
        }
        const allowed = ['title', 'date', 'location', 'description', 'isVirtual', 'coverImage', 'latitude', 'longitude', 'tickets', 'tags'];
        allowed.forEach(k => { if (req.body[k] !== undefined) event[k] = req.body[k]; });
        await event.save();
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/events/:id/tickets — ticket types for an event
--------------------------------------------------- */
exports.get_tickets = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).select('tickets');
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event.tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   POST /api/events/:id/buy — initiate ticket purchase
   Body: { ticketName, quantity }
   Returns Flutterwave payload (or free confirmation)
--------------------------------------------------- */
exports.buy_tickets = async (req, res) => {
    try {
        const { ticketName, quantity } = req.body;
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const ticketDef = event.tickets.find(t => t.name === ticketName);
        if (!ticketDef) return res.status(404).json({ error: 'Ticket type not found' });

        const qty = parseInt(quantity, 10) || 1;
        const available = ticketDef.quantity - ticketDef.sold;
        if (qty > available) return res.status(400).json({ error: `Only ${available} tickets remaining` });

        const totalPaid = ticketDef.price * qty;
        const user = sessionUser(req);

        // --- Free ticket: confirm immediately ---
        if (totalPaid === 0) {
            ticketDef.sold += qty;
            await event.save();
            const purchase = await TicketPurchase.create({
                userId: user._id,
                eventId: event._id,
                ticketName,
                quantity: qty,
                totalPaid: 0,
                currency: ticketDef.currency || 'USD',
                status: 'confirmed'
            });
            return res.json({ confirmed: true, purchase });
        }

        // --- Paid ticket: create pending purchase + return Flutterwave payload ---
        const tx_ref = `lj-ticket-${uuidv4()}`;
        const purchase = await TicketPurchase.create({
            userId: user._id,
            eventId: event._id,
            ticketName,
            quantity: qty,
            totalPaid,
            currency: ticketDef.currency || 'USD',
            paymentRef: tx_ref,
            status: 'pending'
        });

        const flw_payload = {
            tx_ref,
            amount: totalPaid,
            currency: ticketDef.currency || 'USD',
            redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3003'}/events/${event._id}/ticket-confirmed`,
            customer: {
                email: user.email,
                name: user.username || user.name
            },
            customizations: {
                title: event.title,
                description: `${qty}x ${ticketName}`
            }
        };

        res.json({ paymentRequired: true, flw_payload, purchaseId: purchase._id });
    } catch (err) {
        console.error('buy_tickets error:', err);
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   POST /api/events/validate-payment
   Body: { transaction_id, tx_ref }
   Called by frontend after Flutterwave redirect
--------------------------------------------------- */
exports.validate_event_payment = async (req, res) => {
    try {
        const { transaction_id, tx_ref } = req.body;
        if (!transaction_id || !tx_ref) return res.status(400).json({ error: 'Missing transaction_id or tx_ref' });

        const response = await getFlw().Transaction.verify({ id: transaction_id });
        if (response.data?.status !== 'successful') {
            return res.status(400).json({ error: 'Payment not verified', detail: response.data?.status });
        }

        // One checkout shares a single tx_ref across every line item, so confirm
        // them as a set rather than assuming a single row.
        const purchases = await TicketPurchase.find({ paymentRef: tx_ref });
        if (!purchases.length) return res.status(404).json({ error: 'Purchase record not found' });

        // Idempotent: only consume inventory for rows that are still pending, so a
        // replayed verification (double-click, refresh) cannot double-count seats.
        const pending = purchases.filter(p => p.status === 'pending');

        if (pending.length) {
            const event = await Event.findById(purchases[0].eventId);
            if (event) {
                for (const purchase of pending) {
                    const ticketDef = event.tickets.find(t => t.name === purchase.ticketName);
                    if (ticketDef) ticketDef.sold = (ticketDef.sold || 0) + purchase.quantity;
                }
                await event.save();
            }
            await TicketPurchase.updateMany(
                { paymentRef: tx_ref, status: 'pending' },
                { $set: { status: 'confirmed' } }
            );
        }

        res.json({
            confirmed: true,
            purchaseId: purchases[0]._id,
            purchaseIds: purchases.map(p => p._id),
            eventId: purchases[0].eventId,
        });
    } catch (err) {
        console.error('validate_event_payment error:', err);
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   POST /api/tickets/mock-confirm — SIMULATED payment confirmation

   Development only; routes/tickets.js mounts it behind that same guard.

   Live card collection runs through Flutterwave and lands on validate_event_payment
   above. When no provider round-trip is wanted — local dev, design review — the
   payment step simulates the authorisation so the whole purchase flow can be
   exercised end to end. The state transition is deliberately identical to a verified
   transaction (inventory consumed once, purchases confirmed once, idempotent on
   replay), so a simulated receipt is indistinguishable from a real one downstream.
--------------------------------------------------- */
exports.mock_confirm_payment = async (req, res) => {
    // Belt and braces: there must never be a payment-confirming shortcut in production.
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    try {
        const { tx_ref } = req.body;
        if (!tx_ref) return res.status(400).json({ error: 'Missing tx_ref' });

        // A tx_ref identifies its own purchases, so scope to the caller as well.
        const userId = sessionUserId(req);
        const purchases = await TicketPurchase.find({ paymentRef: tx_ref, userId });
        if (!purchases.length) return res.status(404).json({ error: 'Purchase record not found' });

        // Idempotent: only pending rows consume inventory, so a replayed confirmation
        // (double-click, refresh, retry) cannot double-count seats.
        const pending = purchases.filter(p => p.status === 'pending');

        if (pending.length) {
            const event = await Event.findById(purchases[0].eventId);
            if (event) {
                for (const purchase of pending) {
                    const ticketDef = event.tickets.find(t => t.name === purchase.ticketName);
                    if (ticketDef) ticketDef.sold = (ticketDef.sold || 0) + purchase.quantity;
                }
                await event.save();
            }
            await TicketPurchase.updateMany(
                { paymentRef: tx_ref, userId, status: 'pending' },
                { $set: { status: 'confirmed' } }
            );
        }

        console.warn(`[mock-confirm] SIMULATED payment confirmed — ${tx_ref} (${pending.length} pending of ${purchases.length}, user ${userId})`);

        res.json({
            confirmed: true,
            simulated: true,
            purchaseIds: purchases.map(p => p._id),
            eventId: purchases[0].eventId,
        });
    } catch (err) {
        console.error('mock_confirm_payment error:', err);
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/events/user/my-tickets — purchases for the logged-in user
   (also mounted at GET /api/events/my-tickets; see routes/events.js)
--------------------------------------------------- */
exports.my_tickets = async (req, res) => {
    try {
        const purchases = await TicketPurchase.find({ userId: sessionUserId(req), status: 'confirmed' })
            .populate('eventId')
            .sort({ createdAt: -1 });
        res.json(purchases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/events/mine — events created by the signed-in user

   /api/tickets/user/:userId and /api/events/user/:userId both need an id the client
   does not always have (the rebuilt client only knows the session), so TKXTS had no way
   to list the organiser's own events. Same shape as the tkxts list, scoped by session.
--------------------------------------------------- */
exports.my_events = async (req, res) => {
    try {
        const events = await Event.find({ creator: sessionUserId(req) }).sort({ date: -1 });
        const result = events.map(ev => {
            const totalTickets = ev.tickets.reduce((s, t) => s + t.quantity, 0);
            const ticketsSold = ev.tickets.reduce((s, t) => s + (t.sold || 0), 0);
            return { ...ev.toObject(), stats: { totalTickets, ticketsSold } };
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/tickets/:purchaseId — one purchase, for the ticket detail screen

   Owner-scoped: a purchase id is not a bearer token, so another account asking for it
   gets a 404 rather than someone else's ticket.
--------------------------------------------------- */
exports.get_purchase = async (req, res) => {
    try {
        const purchase = await TicketPurchase.findOne({ _id: req.params.purchaseId, userId: sessionUserId(req) })
            .populate('eventId', 'title date time location coverImage');
        if (!purchase) return res.status(404).json({ error: 'Ticket not found' });
        res.json(purchase);
    } catch (err) {
        // A malformed id is a bad request, not a server fault.
        res.status(400).json({ error: 'Ticket not found' });
    }
};

/* ---------------------------------------------------
   GET /api/events/user/:userId — events created by a user
--------------------------------------------------- */
exports.user_events = async (req, res) => {
    try {
        const events = await Event.find({ creator: req.params.userId }).sort({ date: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/events/:id/dashboard — event stats (admin)
--------------------------------------------------- */
exports.event_dashboard = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (String(event.creator) !== String(sessionUserId(req))) {
            return res.status(403).json({ error: 'Not authorised' });
        }
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
};

/* ---------------------------------------------------
   POST /api/tickets/buy          <- documented public contract
   POST /api/events/tickets/buy   <- historical alias (same handler)

   Checkout — buy one or more ticket types for a single event.
   Body: { eventId, selections: { ticketId: qty }, guestInfo }
   Returns either { confirmed: true, purchases }            (free tickets)
   or           { paymentRequired: true, flw_payload, ... } (paid tickets)

   SECURITY: a paid checkout is NEVER confirmed here. We create `pending`
   purchases sharing one Flutterwave tx_ref and return the payment payload.
   Only POST /api/events/validate-payment — which verifies the transaction
   with Flutterwave — may set them to `confirmed`. Inventory is therefore
   consumed at verification time, not at checkout, so an abandoned checkout
   can never strand seats.
--------------------------------------------------- */
exports.buy_tickets_v2 = async (req, res) => {
    try {
        const { eventId, selections } = req.body;

        if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

        const wanted = Object.entries(selections || {})
            .map(([ticketId, qty]) => [ticketId, parseInt(qty, 10) || 0])
            .filter(([, qty]) => qty > 0);
        if (!wanted.length) return res.status(400).json({ error: 'No tickets selected' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const userId = sessionUserId(req);

        // Resolve and price every selected ticket type before writing anything.
        const lines = [];
        for (const [ticketId, qty] of wanted) {
            const ticketDef = event.tickets.id(ticketId);
            if (!ticketDef) return res.status(400).json({ error: `Unknown ticket type: ${ticketId}` });
            const available = ticketDef.quantity - (ticketDef.sold || 0);
            if (qty > available) {
                return res.status(400).json({ error: `Only ${available} of '${ticketDef.name}' remaining` });
            }
            lines.push({ ticketDef, qty, price: ticketDef.price || 0 });
        }

        const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
        const currency = lines[0].ticketDef.currency || 'NGN';

        const createPurchase = (line, extra) => TicketPurchase.create({
            userId,
            eventId: event._id,
            ticketName: line.ticketDef.name,
            quantity: line.qty,
            totalPaid: line.price * line.qty,
            currency,
            ...extra,
        });

        // ---- Free tickets: nothing to verify, confirm immediately ----
        if (total === 0) {
            const purchases = [];
            for (const line of lines) {
                line.ticketDef.sold = (line.ticketDef.sold || 0) + line.qty;
                purchases.push(await createPurchase(line, { status: 'confirmed' }));
            }
            await event.save();
            return res.status(201).json({ confirmed: true, purchases });
        }

        // ---- Paid tickets: pending until Flutterwave verifies the payment ----
        const tx_ref = `lj-ticket-${uuidv4()}`;
        const purchases = [];
        for (const line of lines) {
            purchases.push(await createPurchase(line, { paymentRef: tx_ref, status: 'pending' }));
        }

        const flw_payload = {
            tx_ref,
            amount: total,
            currency,
            redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3003'}/events/${event._id}/ticket-confirmed`,
            customer: {
                email: req.user?.email,
                name: req.user?.username,
            },
            customizations: {
                title: event.title,
                description: lines.map(l => `${l.qty}x ${l.ticketDef.name}`).join(', '),
            },
        };

        return res.status(201).json({
            paymentRequired: true,
            flw_payload,
            purchaseIds: purchases.map(p => p._id),
        });
    } catch (err) {
        console.error('buy_tickets_v2 error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/events/:id/sessions — sessions for an event
--------------------------------------------------- */
exports.get_sessions = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).select('sessions');
        if (!event) return res.status(404).json({ error: 'Not found' });
        res.json(event.sessions || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   POST /api/events/:id/sessions — add session (creator only)
--------------------------------------------------- */
exports.create_session = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Not found' });
        if (String(event.creator) !== String(sessionUserId(req))) return res.status(403).json({ error: 'Not authorised' });
        if (!event.sessions) event.sessions = [];
        event.sessions.push(req.body);
        await event.save();
        res.status(201).json(event.sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
