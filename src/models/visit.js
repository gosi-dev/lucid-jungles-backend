const mongoose = require('mongoose');

// Visit — the record that one user stood inside another user's base.
//
// One row per (host, visitor, day). The compound unique index makes "I visited
// you today" idempotent, so refreshing the page, navigating back, or opening a
// second tab cannot inflate a base's visitor count.
//
// Counts are deliberately *derived* from this collection rather than stored as a
// counter on the user document. A denormalised counter drifts the moment one
// write fails, and a wrong visitor count is a visible lie in someone's home.
const visitSchema = new mongoose.Schema({
    hostId:    { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    day:       { type: String, required: true },   // YYYY-MM-DD (UTC) — one visit per visitor per day
}, { timestamps: true });

visitSchema.index({ hostId: 1, visitorId: 1, day: 1 }, { unique: true });
visitSchema.index({ hostId: 1, createdAt: -1 });

exports.Visit = mongoose.model('visit', visitSchema);
