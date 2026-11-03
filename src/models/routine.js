const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    name:  { type: String },
    sets:  { type: Number },
    reps:  { type: String },   // String to allow "8-12" ranges
    rest:  { type: String },   // "60s", "90s", "2 min"
    notes: { type: String }
}, { _id: false });

const daySchema = new mongoose.Schema({
    day:       { type: String },   // "Monday", "Wednesday" etc.
    name:      { type: String },   // "Upper Body Push", "Rest", etc.
    isRest:    { type: Boolean, default: false },
    exercises: [exerciseSchema],
    duration:  { type: Number }    // estimated minutes
}, { _id: false });

const routineSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    fanbaseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'fanbase', required: true },
    weekNumber: { type: Number, required: true },
    programme:  [daySchema],
    generatedAt:{ type: Date, default: Date.now }
},
{ timestamps: true });

// One routine per user per fanbase per week
routineSchema.index({ userId: 1, fanbaseId: 1, weekNumber: 1 }, { unique: true });

exports.Routine = mongoose.model('routine', routineSchema);
