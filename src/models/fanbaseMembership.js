const mongoose = require('mongoose');

const FanbaseMembershipSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    fanbaseId:{ type: mongoose.Schema.Types.ObjectId, ref: 'fanbase', required: true },

    // Payment record (populated for paid Fanbases)
    paymentRef: { type: String },       // Flutterwave tx_ref
    amountPaid: { type: Number },
    currency:   { type: String },
    joinedAt:   { type: Date, default: Date.now },

    // Dojo fitness layer (populated only for fanbaseType === 'fitness')
    currentBodyShape: {
        type: String,
        enum: ['Titan', 'Bear', 'Everyday', 'Runner', 'Athlete', 'Lifter']
    },
    goalBodyShape: {
        type: String,
        enum: ['Runner', 'Athlete', 'Lifter', 'Survivor']
    },
    fitnessGoal: {
        type: String,
        enum: ['fat_loss', 'muscle', 'endurance', 'general']
    },
    daysPerWeek: { type: Number },
    equipment:   {
        type: String,
        enum: ['none', 'dumbbells', 'full_gym']
    },
    avoid:       { type: String },

    // Body metrics
    heightCm:      { type: Number },   // cm
    weightKg:      { type: Number },   // kg
    desiredWeightKg: { type: Number }, // kg

    // Progress
    dojoXp: { type: Number, default: 0 },

    // Onboarding state — tracks whether custom onboarding has been completed
    onboardingComplete: { type: Boolean, default: false }
},
{
    timestamps: true
});

// Prevent duplicate memberships
FanbaseMembershipSchema.index({ userId: 1, fanbaseId: 1 }, { unique: true });

exports.FanbaseMembership = mongoose.model('fanbaseMembership', FanbaseMembershipSchema);
