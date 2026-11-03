/**
 * Portfolio route — serves the Cappuccino Studio X portfolio as a user page
 * at /cappuccinostudiox. All static files and API routes are scoped under this prefix.
 * ZERO external dependencies — all data from local JSON files, all assets from disk.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ── Path to the portfolio project ──────────────────────────────────────────────
const PORTFOLIO_ROOT = path.resolve(__dirname, '../../../../portfolio');
const PROJECTS_PATH = path.join(PORTFOLIO_ROOT, 'src', 'data', 'projects.json');
const SITE_CONFIG_PATH = path.join(PORTFOLIO_ROOT, 'src', 'data', 'site-config.json');
const BOOKINGS_PATH = path.join(PORTFOLIO_ROOT, 'src', 'data', 'bookings.json');
const WAITLIST_PATH = path.join(PORTFOLIO_ROOT, 'src', 'data', 'waitlist.json');

// ── Helpers ────────────────────────────────────────────────────────────────────
function readJSON(fp, fallback) {
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch { return fallback; }
}
function writeJSON(fp, data) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

// JSON body parsing for POST routes
router.use('/api', express.json({ limit: '50mb' }));

// ══════════════════════════════════════════════════════════════════════════════
//  API ROUTES — all local, zero external dependencies
// ══════════════════════════════════════════════════════════════════════════════

// GET /cappuccinostudiox/api/local/projects — project list
router.get('/api/local/projects', (req, res) => {
    try {
        const data = readJSON(PROJECTS_PATH, []);
        res.json(data.map(p => ({
            id: p.id,
            name: p.name,
            thumbnail: p.thumbnail || null
        })));
    } catch (e) {
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

// GET /cappuccinostudiox/api/local/projects/:id — single project
router.get('/api/local/projects/:id', (req, res) => {
    try {
        const data = readJSON(PROJECTS_PATH, []);
        const project = data.find(p => String(p.id) === String(req.params.id));
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load project' });
    }
});

// POST /cappuccinostudiox/api/local/projects — save project
router.post('/api/local/projects', (req, res) => {
    try {
        let data = readJSON(PROJECTS_PATH, []);
        const idx = data.findIndex(p => String(p.id) === String(req.body.id));
        if (idx >= 0) data[idx] = req.body;
        else data.push(req.body);
        writeJSON(PROJECTS_PATH, data);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// GET /cappuccinostudiox/api/project-files-config
router.get('/api/project-files-config', (req, res) => {
    try {
        const cfg = readJSON(SITE_CONFIG_PATH, {});
        res.json({ config: cfg.project_files_3d || null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /cappuccinostudiox/api/project-files-config
router.post('/api/project-files-config', (req, res) => {
    try {
        const cfg = readJSON(SITE_CONFIG_PATH, {});
        cfg.project_files_3d = req.body.config || req.body;
        writeJSON(SITE_CONFIG_PATH, cfg);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /cappuccinostudiox/api/availability
router.get('/api/availability', (req, res) => {
    try {
        const bookings = readJSON(BOOKINGS_PATH, []);
        const dates = [];
        const now = new Date();
        let day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        while (dates.length < 15) {
            const dow = day.getDay();
            if (dow !== 0 && dow !== 6) {
                const iso = day.toISOString().slice(0, 10);
                const slots = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
                const booked = bookings.filter(b => b.datetime && b.datetime.startsWith(iso)).map(b => b.datetime.slice(11, 16));
                const available = slots.filter(s => !booked.includes(s));
                dates.push({ date: iso, label: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), times: available });
            }
            day = new Date(day.getTime() + 86400000);
        }
        res.json({ dates });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /cappuccinostudiox/api/bookings
router.post('/api/bookings', (req, res) => {
    try {
        const bookings = readJSON(BOOKINGS_PATH, []);
        const entry = { id: Date.now(), ...req.body, created_at: new Date().toISOString() };
        bookings.push(entry);
        writeJSON(BOOKINGS_PATH, bookings);
        res.json(entry);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /cappuccinostudiox/api/waitlist
router.post('/api/waitlist', (req, res) => {
    try {
        const list = readJSON(WAITLIST_PATH, []);
        const entry = { id: Date.now(), ...req.body, created_at: new Date().toISOString() };
        list.push(entry);
        writeJSON(WAITLIST_PATH, list);
        res.json(entry);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /cappuccinostudiox/api/upload — local file upload
try {
    const multer = require('multer');
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const pid = req.body.projectId || 'unknown';
            const dir = path.join(PORTFOLIO_ROOT, 'public', 'assets', 'projects', String(pid));
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const unique = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
            const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            cb(null, `${unique}-${safe}`);
        }
    });
    const upload = multer({ storage, limits: { fileSize: 300 * 1024 * 1024 } });

    router.post('/api/upload', upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const pid = req.body.projectId || 'unknown';
        const url = `/cappuccinostudiox/assets/projects/${pid}/${req.file.filename}`;
        res.json({ url, filename: req.file.filename });
    });
} catch (e) {
    console.warn('Portfolio: multer not available — file uploads disabled');
}

// ── Local project assets (long cache — filenames are content-hashed) ──────────
router.use('/assets/projects', express.static(path.join(PORTFOLIO_ROOT, 'public/assets/projects'), {
    maxAge: '30d',
    immutable: true
}));

// ── Portfolio static files (HTML, JS, CSS, images, fonts, scenes) ──────────────
router.use(express.static(PORTFOLIO_ROOT, {
    index: 'index.html',
    extensions: ['html'],
    maxAge: '1h',
    setHeaders(res, filePath) {
        // HTML should always revalidate; assets/fonts/scenes can cache longer
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (/\.(js|css)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=3600');        // 1 hour
        } else if (/\.(woff2?|ttf|otf|eot)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000');     // 30 days
        } else if (/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');       // 1 day
        }
    }
}));

// Fallback: serve index.html for any unmatched route
router.get('*', (req, res) => {
    const filePath = path.join(PORTFOLIO_ROOT, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }
    res.sendFile(path.join(PORTFOLIO_ROOT, 'index.html'));
});

module.exports = { portfolioRouter: router };
