const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    text:      { type: String, required: true },
    completed: { type: Boolean, default: false }
}, { _id: true });

const dreamLogSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    title:     { type: String, default: '' },
    content:   { type: String, required: true },
    isPrivate: { type: Boolean, default: false },
    tasks:     [taskSchema]
},
{ timestamps: true });

dreamLogSchema.index({ userId: 1, createdAt: -1 });

exports.DreamLog = mongoose.model('dreamLog', dreamLogSchema);
