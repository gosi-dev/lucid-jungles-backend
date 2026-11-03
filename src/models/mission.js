const mongoose = require('mongoose');

// Mission — daily/weekly/monthly progression quest (DATA_MODEL.md: Mission)
const missionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  description: { type: String },
  type:        { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  progress:    { type: Number, default: 0 },
  goal:        { type: Number, default: 1 },
  reward:      { type: Object },
  status:      { type: String, enum: ['active', 'completed', 'claimed'], default: 'active' },
}, { timestamps: true });

missionSchema.index({ userId: 1, status: 1 });

exports.Mission = mongoose.model('Mission', missionSchema);
