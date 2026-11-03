const mongoose = require('mongoose');

// HomeBase — the user's personal base (DATA_MODEL.md: HomeBase)
const homeBaseSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  roomLayout:    { type: String, default: 'default' },
  decorItems:    [{ type: String }],
  furniture:     [{ type: String }],
  upgradeLevel:  { type: Number, default: 1 },
  theme:         { type: String, default: 'jungle' },
  lastUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

exports.HomeBase = mongoose.model('HomeBase', homeBaseSchema);
