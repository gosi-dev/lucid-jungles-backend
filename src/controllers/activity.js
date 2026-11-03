const { User } = require('../models/user');
const { FanbaseMembership } = require('../models/fanbaseMembership');

// Silhouette progression chain
const SILHOUETTE_ORDER = ['Titan', 'Bear', 'Everyday', 'Runner', 'Athlete', 'Lifter'];

// Dojo XP needed per shape to advance to the next
const DOJO_XP_THRESHOLD = 500;   // 500 XP per shape level

// Platform XP awarded per workout
const PLATFORM_XP_PER_WORKOUT = 50;

// Platform level thresholds (mirrors main.js existing logic — kept in sync)
const LEVEL_THRESHOLDS = [
    { xp: 100000, level: 'Legend' },
    { xp: 50000,  level: 'Shaman' },
    { xp: 20000,  level: 'Seer' },
    { xp: 10000,  level: 'Champion' },
    { xp: 5000,   level: 'Initiate' },
    { xp: 1000,   level: 'Seeker' },
    { xp: 0,      level: 'Wanderer' }
];

const computeLevel = (xp) => {
    for (const t of LEVEL_THRESHOLDS) {
        if (xp >= t.xp) return t.level;
    }
    return 'Wanderer';
};

/* ---------------------------------------------------
   POST /api/activity/log
   Body: { fanbaseId, activityType: 'workout', notes? }
   Returns: { dojoXp, platformXp, levelUp, silhouetteAdvanced, newLevel, newShape }
--------------------------------------------------- */
exports.log_activity = async (req, res) => {
    try {
        const userId = req.session.user;
        const { fanbaseId, activityType = 'workout' } = req.body;
        if (!fanbaseId) return res.status(400).json({ error: 'fanbaseId required' });

        const [user, membership] = await Promise.all([
            User.findById(userId),
            FanbaseMembership.findOne({ userId, fanbaseId })
        ]);

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!membership) return res.status(404).json({ error: 'Not a member of this Fanbase' });

        let silhouetteAdvanced = false;
        let levelUp = false;
        const prevLevel = computeLevel(user.xp);

        // --- Award Dojo XP ---
        const dojoXpGained = activityType === 'workout' ? 100 : 25;
        membership.dojoXp = (membership.dojoXp || 0) + dojoXpGained;

        // Check silhouette advancement
        const currentIndex = SILHOUETTE_ORDER.indexOf(membership.currentBodyShape);
        const goalIndex    = SILHOUETTE_ORDER.indexOf(membership.goalBodyShape);

        if (
            currentIndex !== -1 &&
            currentIndex < goalIndex &&               // haven't reached goal yet
            membership.dojoXp >= DOJO_XP_THRESHOLD * (currentIndex + 1)
        ) {
            const nextShape = SILHOUETTE_ORDER[currentIndex + 1];
            membership.currentBodyShape = nextShape;
            silhouetteAdvanced = true;
        }

        await membership.save();

        // --- Award Platform XP ---
        user.xp = (user.xp || 0) + PLATFORM_XP_PER_WORKOUT;
        const newLevel = computeLevel(user.xp);
        if (newLevel !== prevLevel) {
            user.level = newLevel;
            levelUp = true;
        }
        await user.save();

        res.json({
            dojoXp: membership.dojoXp,
            dojoXpGained,
            platformXp: user.xp,
            platformXpGained: PLATFORM_XP_PER_WORKOUT,
            levelUp,
            newLevel: user.level,
            silhouetteAdvanced,
            newShape: membership.currentBodyShape
        });
    } catch (err) {
        console.error('log_activity error:', err);
        res.status(500).json({ error: err.message });
    }
};
