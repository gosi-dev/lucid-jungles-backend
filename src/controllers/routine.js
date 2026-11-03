const OpenAI = require('openai');
const { Routine } = require('../models/routine');
const { FanbaseMembership } = require('../models/fanbaseMembership');

// Lazy-init so missing key at require-time doesn't crash
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Jungle Fight Club — Week 1 fallback (used when OpenAI quota is exhausted)
// 5 days/week: Mon–Fri. Kicks added. Volume scales Mon → Tue → Wed → Thu. Fri = FLOW.
const JUNGLE_FIGHT_CLUB_W1 = [
    {
        day: 'Monday', name: 'IGNITION — Strike & Activate', isRest: false, duration: 60,
        exercises: [
            { name: 'Shadowbox Warmup',       sets: 1, reps: '3 min',        rest: '—'  },
            { name: 'Jab-Cross Shadowboxing', sets: 5, reps: '120 sec',      rest: '30s' },
            { name: 'Explosive Push-Ups',     sets: 4, reps: '25',           rest: '45s' },
            { name: 'Roundhouse Kicks',       sets: 3, reps: '20 each side', rest: '45s' },
            { name: 'Jump Squats',            sets: 3, reps: '25',           rest: '45s' },
            { name: 'Front Kicks',            sets: 3, reps: '20 each side', rest: '45s' },
            { name: 'Plank Hold',             sets: 3, reps: '45 sec',       rest: '30s' },
            { name: 'Burpees',                sets: 3, reps: '15',           rest: '60s' }
        ]
    },
    {
        day: 'Tuesday', name: 'SHADOW — Strike & Build', isRest: false, duration: 65,
        exercises: [
            { name: 'Shadowbox Warmup',       sets: 1, reps: '3 min',        rest: '—'  },
            { name: 'Jab-Cross Shadowboxing', sets: 5, reps: '150 sec',      rest: '30s' },
            { name: 'Explosive Push-Ups',     sets: 4, reps: '30',           rest: '45s' },
            { name: 'Roundhouse Kicks',       sets: 3, reps: '25 each side', rest: '45s' },
            { name: 'Jump Squats',            sets: 3, reps: '30',           rest: '45s' },
            { name: 'Front Kicks',            sets: 3, reps: '25 each side', rest: '45s' },
            { name: 'Plank Hold',             sets: 3, reps: '55 sec',       rest: '30s' },
            { name: 'Burpees',                sets: 3, reps: '18',           rest: '60s' }
        ]
    },
    { day: 'Wednesday', name: 'Rest', isRest: true, exercises: [], duration: 0 },
    {
        day: 'Thursday', name: 'SURGE — Power & Conditioning', isRest: false, duration: 70,
        exercises: [
            { name: 'Shadowbox Warmup',       sets: 1, reps: '5 min',        rest: '—'  },
            { name: 'Jab-Cross Shadowboxing', sets: 6, reps: '120 sec',      rest: '30s' },
            { name: 'Explosive Push-Ups',     sets: 5, reps: '25',           rest: '45s' },
            { name: 'Roundhouse Kicks',       sets: 4, reps: '20 each side', rest: '45s' },
            { name: 'Jump Squats',            sets: 4, reps: '25',           rest: '45s' },
            { name: 'Front Kicks',            sets: 4, reps: '20 each side', rest: '45s' },
            { name: 'Plank Hold',             sets: 3, reps: '60 sec',       rest: '30s' },
            { name: 'Burpees',                sets: 4, reps: '15',           rest: '60s' }
        ]
    },
    {
        day: 'Friday', name: 'FLOW — Mobility & Recovery', isRest: false, duration: 30,
        exercises: [
            { name: 'Full-Body Mobility Flow',       sets: 1, reps: '10 min', rest: '—' },
            { name: 'Hip Flexor & Shoulder Stretch', sets: 1, reps: '8 min',  rest: '—' },
            { name: 'Sun Salutations',               sets: 1, reps: '7 min',  rest: '—' },
            { name: 'Box Breathing',                 sets: 1, reps: '5 min',  rest: '—' }
        ]
    },
    { day: 'Saturday', name: 'FORGE — Grind & Kick', isRest: false, duration: 55,
        exercises: [
            { name: 'Shadowbox Warmup',       sets: 1, reps: '3 min',        rest: '—'  },
            { name: 'Jab-Cross Shadowboxing', sets: 4, reps: '120 sec',      rest: '30s' },
            { name: 'Explosive Push-Ups',     sets: 3, reps: '25',           rest: '45s' },
            { name: 'Roundhouse Kicks',       sets: 3, reps: '20 each side', rest: '45s' },
            { name: 'Jump Squats',            sets: 3, reps: '25',           rest: '45s' },
            { name: 'Side Kicks',             sets: 3, reps: '20 each side', rest: '45s' },
            { name: 'Plank Hold',             sets: 3, reps: '45 sec',       rest: '30s' },
            { name: 'Burpees',                sets: 2, reps: '15',           rest: '60s' }
        ]
    },
    { day: 'Sunday',   name: 'Rest', isRest: true, exercises: [], duration: 0 }
];

// Week number helper (ISO week)
const getWeekNumber = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/* ---------------------------------------------------
   POST /api/routine/generate
   Generates a personalised weekly programme via OpenAI
   Body: { fanbaseId }
--------------------------------------------------- */
exports.generate_routine = async (req, res) => {
    const userId = req.session.user;
    const { fanbaseId } = req.body;

    try {
        if (!fanbaseId) return res.status(400).json({ error: 'fanbaseId required' });

        // Get membership + fitness profile
        const membership = await FanbaseMembership.findOne({ userId, fanbaseId });
        if (!membership) return res.status(404).json({ error: 'Not a member of this Fanbase' });
        if (!membership.onboardingComplete) return res.status(400).json({ error: 'Complete onboarding first' });

        const weekNumber = getWeekNumber();

        // Return existing if already generated this week
        const existing = await Routine.findOne({ userId, fanbaseId, weekNumber });
        if (existing) return res.json({ routine: existing, cached: true });

        // Build prompt
        const profile = {
            goal: membership.fitnessGoal,
            daysPerWeek: membership.daysPerWeek,
            equipment: membership.equipment,
            avoid: membership.avoid || 'nothing',
            currentShape: membership.currentBodyShape,
            targetShape: membership.goalBodyShape,
            height: membership.heightCm ? `${membership.heightCm}cm` : 'not specified',
            weight: membership.weightKg ? `${membership.weightKg}kg` : 'not specified',
            desiredWeight: membership.desiredWeightKg ? `${membership.desiredWeightKg}kg` : 'not specified'
        };

        const prompt = `You are a professional personal trainer. Create a ${profile.daysPerWeek}-day per week fitness programme for someone with the following profile:
- Goal: ${profile.goal}
- Equipment available: ${profile.equipment}
- Body type now: ${profile.currentShape}
- Body type goal: ${profile.targetShape}
- Height: ${profile.height}
- Current weight: ${profile.weight}
- Desired weight: ${profile.desiredWeight}
- Exercises to avoid: ${profile.avoid}

Respond ONLY with a valid JSON array. Each element represents one training day with this structure:
{
  "day": "Monday",
  "name": "Workout name",
  "isRest": false,
  "exercises": [
    { "name": "Exercise name", "sets": 3, "reps": "8-12", "rest": "60s" }
  ],
  "duration": 45
}

Include rest days as: { "day": "...", "name": "Rest", "isRest": true, "exercises": [], "duration": 0 }
The array must cover all 7 days of the week. Return only the JSON array, no other text.`;

        // Skip OpenAI if no key — go straight to fallback
        if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('no_api_key'), { status: 429 });

        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000
        });

        const raw = completion.choices[0].message.content.trim();
        // Strip potential markdown code fences
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const programme = JSON.parse(jsonStr);

        const routine = await Routine.create({ userId, fanbaseId, weekNumber, programme });
        res.status(201).json({ routine, cached: false });

    } catch (err) {
        console.error('generate_routine error:', err);
        // Any OpenAI failure (quota, missing key, network) — use hardcoded fallback
        try {
            const fallback = await Routine.create({
                userId,
                fanbaseId,
                weekNumber: getWeekNumber(),
                programme: JUNGLE_FIGHT_CLUB_W1
            });
            return res.status(201).json({ routine: fallback, cached: false, fallback: true });
        } catch (saveErr) {
            console.error('Failed to save fallback routine:', saveErr);
            return res.status(503).json({ error: 'quota_exceeded' });
        }
    }
};

/* ---------------------------------------------------
   GET /api/routine/current
   Returns user's current week routine for a fanbase
   Query: fanbaseId
--------------------------------------------------- */
exports.get_current_routine = async (req, res) => {
    try {
        const userId = req.session.user;
        const { fanbaseId } = req.query;
        if (!fanbaseId) return res.status(400).json({ error: 'fanbaseId required' });

        const weekNumber = getWeekNumber();
        const routine = await Routine.findOne({ userId, fanbaseId, weekNumber });
        if (!routine) return res.status(404).json({ error: 'No routine for this week — generate one first' });
        res.json(routine);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/routine/today
   Returns today's specific day entry from the current week routine
   Query: fanbaseId
--------------------------------------------------- */
exports.get_today = async (req, res) => {
    try {
        const userId = req.session.user;
        const { fanbaseId } = req.query;
        if (!fanbaseId) return res.status(400).json({ error: 'fanbaseId required' });

        const weekNumber = getWeekNumber();
        const routine = await Routine.findOne({ userId, fanbaseId, weekNumber });
        if (!routine) return res.status(404).json({ error: 'No routine this week' });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        const todayEntry = routine.programme.find(d => d.day === todayName);

        if (!todayEntry) return res.status(404).json({ error: `No entry for ${todayName}` });
        res.json({ today: todayEntry, weekNumber });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
