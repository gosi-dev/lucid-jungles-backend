const mongoose = require('mongoose');

// Caches Kura's daily reading per user — regenerated once per calendar day
const kuraStateSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, unique: true },
    message:   { type: String, required: true },
    resonance: { type: String, enum: ['pulse', 'dream', 'shadow', 'style'], default: 'pulse' },
    beast:     { type: String, required: true },
    nudge:     { type: String },
    nudgeRoute: { type: String },   // frontend path to navigate to on nudge tap
    generatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

kuraStateSchema.index({ userId: 1 });

exports.KuraState = mongoose.model('kuraState', kuraStateSchema);
