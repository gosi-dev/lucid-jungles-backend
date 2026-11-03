const mongoose = require('mongoose');

const mapPositionSchema = new mongoose.Schema({
  entityId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  entityType: { type: String, required: true, enum: ['User', 'Community'], default: 'User' },
  entityName: { type: String, required: true },
  gridX:      { type: Number, required: true },
  gridY:      { type: Number, required: true },
  assignmentType: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  connections: [{ entityId: mongoose.Schema.Types.ObjectId, strength: Number }],
}, { timestamps: true });

mapPositionSchema.index({ entityId: 1, entityType: 1 }, { unique: true });

exports.MapPosition = mongoose.model('MapPosition', mapPositionSchema);
