const OpenAI = require('openai');
const { KuraState } = require('../models/kuraState');
const { DreamLog } = require('../models/dreamlog');
const { FanbaseMembership } = require('../models/fanbaseMembership');
const { Routine } = require('../models/routine');
const { User } = require('../models/user');

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ISO week number helper
const getWeekNumber = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const isSameDay = (a, b) => {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
};

const BEAST_MAP = {
    pulse:  'Flashrunner',
    dream:  'Slumber Stag',
    shadow: 'Howlcoil',
    style:  'Threadhopper'
};

// Rule-based resonance — no AI needed for this
const deriveResonance = ({ recentDream, pendingTasks, dojoXpRecent, daysSinceActivity, userLevel }) => {
    if (recentDream && pendingTasks > 0)    return 'dream';
    if (dojoXpRecent > 0)                   return 'pulse';
    if (daysSinceActivity >= 3)             return 'shadow';
    if (userLevel === 'Champion' || userLevel === 'Shaman' || userLevel === 'Legend') return 'style';
    if (recentDream)                        return 'dream';
    return 'pulse';
};

const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 6)  return 'deep night';
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 21) return 'evening';
    return 'night';
};

/* ---------------------------------------------------
   GET /api/kura/daily-state
   Returns Kura's daily reading for the current user.
   Cached per user per calendar day.
--------------------------------------------------- */
exports.daily_state = async (req, res) => {
    try {
        const userId = req.session.user;

        // Return cached state if generated today
        const cached = await KuraState.findOne({ userId });
        if (cached && isSameDay(new Date(cached.generatedAt), new Date())) {
            return res.json(cached);
        }

        // --- Gather context in parallel ---
        const now = new Date();
        const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
        const twoDaysAgo   = new Date(now - 2 * 24 * 60 * 60 * 1000);

        const [recentDreams, membership, routine, user] = await Promise.all([
            DreamLog.find({ userId }).sort({ createdAt: -1 }).limit(3).lean(),
            FanbaseMembership.findOne({ userId, onboardingComplete: true }).lean(),
            Routine.findOne({ userId, weekNumber: getWeekNumber() }).lean(),
            User.findById(userId).lean()
        ]);

        // Analyse context
        const latestDream      = recentDreams[0] || null;
        const recentDream      = latestDream && new Date(latestDream.createdAt) > twoDaysAgo;
        const pendingTasks     = recentDreams.reduce((n, e) =>
            n + (e.tasks?.filter(t => !t.completed).length || 0), 0);

        // XP gained in last 48h is hard to track without activity log timestamps,
        // so we use dojoXp as a proxy — if they have any, they've been active
        const dojoXpRecent     = membership?.dojoXp > 0 ? 1 : 0;

        // Days since last dream log as proxy for inactivity
        const daysSinceActivity = latestDream
            ? Math.floor((now - new Date(latestDream.createdAt)) / (1000 * 60 * 60 * 24))
            : 99;

        const userLevel        = user?.level || 'Wanderer';
        const hasRoutine       = !!routine;
        const fitnessGoal      = membership?.fitnessGoal || null;
        const currentShape     = membership?.currentBodyShape || null;
        const goalShape        = membership?.goalBodyShape || null;

        const resonance = deriveResonance({ recentDream, pendingTasks, dojoXpRecent, daysSinceActivity, userLevel });
        const beast     = BEAST_MAP[resonance];

        // Nudge logic
        let nudge = null;
        let nudgeRoute = null;
        if (!hasRoutine && membership) {
            nudge      = "Your weekly programme hasn't been generated yet. Step into the Dojo.";
            nudgeRoute = '/dojo';
        } else if (pendingTasks > 0) {
            nudge      = `You have ${pendingTasks} task${pendingTasks > 1 ? 's' : ''} waiting from your last log.`;
            nudgeRoute = null; // opens dream log on kura page
        } else if (daysSinceActivity >= 3) {
            nudge      = "Three days of silence. Write something. Even one line.";
            nudgeRoute = null;
        } else if (hasRoutine && resonance === 'pulse') {
            nudge      = "Your programme is ready. Today's session is waiting.";
            nudgeRoute = '/dojo';
        }

        // Build prompt for Kura's voice
        const context = [
            latestDream ? `Last dream log: "${latestDream.content.slice(0, 120)}..."` : 'No recent dream log.',
            fitnessGoal ? `Fitness goal: ${fitnessGoal}. Body shape journey: ${currentShape} → ${goalShape}.` : '',
            hasRoutine  ? 'Weekly fitness programme is active.' : 'No fitness programme generated yet.',
            `Platform level: ${userLevel}.`,
            `Time: ${timeOfDay()}.`,
            pendingTasks > 0 ? `${pendingTasks} unfinished task(s) from dream log.` : ''
        ].filter(Boolean).join(' ');

        const prompt = `You are KṺRA — a calm, ancient, warm presence who lives in the Lucid Jungle. You speak in short, poetic lines. Never more than 3 sentences. No emojis. No questions. You are responding to this person's current state:

${context}

Their resonance today is: ${resonance} (beast: ${beast}).

Speak directly to them. Acknowledge where they are. Leave them feeling seen, not lectured.`;

        let message = `${beast} is with you today. Move when you're ready. The Jungle waits.`;

        try {
            const openai = getOpenAI();
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.85,
                max_tokens: 120
            });
            message = completion.choices[0].message.content.trim();
        } catch (aiErr) {
            // OpenAI unavailable — use fallback message, still cache result
            console.warn('Kura AI unavailable, using fallback:', aiErr.status || aiErr.message);
        }

        // Upsert cache
        const state = await KuraState.findOneAndUpdate(
            { userId },
            { message, resonance, beast, nudge, nudgeRoute, generatedAt: now },
            { upsert: true, new: true }
        );

        return res.json(state);

    } catch (err) {
        console.error('kura daily_state error:', err);
        return res.status(500).json({ error: 'Failed to load Kura state' });
    }
};
