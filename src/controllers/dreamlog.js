const { DreamLog } = require('../models/dreamlog');
const mongoose = require('mongoose');

/* ---------------------------------------------------
   POST /api/dreamlog
   Body: { content, isPrivate, tasks?: [{text}] }
--------------------------------------------------- */
exports.create_entry = async (req, res) => {
    try {
        const { title = '', content, isPrivate = false, tasks = [] } = req.body;
        if (!content) return res.status(400).json({ error: 'content required' });

        const entry = await DreamLog.create({
            userId: req.session.user,
            title,
            content,
            isPrivate,
            tasks: tasks.map(t => ({ text: t.text || t, completed: false }))
        });
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/dreamlog
   Own entries (all, newest first)
--------------------------------------------------- */
exports.get_my_entries = async (req, res) => {
    try {
        const entries = await DreamLog.find({ userId: req.session.user })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   GET /api/dreamlog/public/:userId
   Public entries for a user's profile
--------------------------------------------------- */
exports.get_public_entries = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }
        const entries = await DreamLog.find({ userId, isPrivate: false })
            .sort({ createdAt: -1 })
            .limit(30);
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   PATCH /api/dreamlog/:entryId
   Update content/privacy OR tick a task
   Body (entry update): { content?, isPrivate? }
   Body (task tick):    { taskIndex: number, completed: boolean }
--------------------------------------------------- */
exports.update_entry = async (req, res) => {
    try {
        const entry = await DreamLog.findOne({
            _id: req.params.entryId,
            userId: req.session.user
        });
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        const { taskIndex, completed, content, isPrivate, tasks } = req.body;

        // Task tick
        if (taskIndex !== undefined && completed !== undefined) {
            if (!entry.tasks[taskIndex]) return res.status(400).json({ error: 'Task index out of range' });
            entry.tasks[taskIndex].completed = completed;
        }

        // Content / privacy update
        if (content !== undefined) entry.content = content;
        if (isPrivate !== undefined) entry.isPrivate = isPrivate;

        // Replace entire tasks array (when editing intentions)
        if (Array.isArray(tasks)) entry.tasks = tasks;

        await entry.save();
        res.json(entry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* ---------------------------------------------------
   DELETE /api/dreamlog/:entryId
--------------------------------------------------- */
exports.delete_entry = async (req, res) => {
    try {
        const result = await DreamLog.deleteOne({
            _id: req.params.entryId,
            userId: req.session.user
        });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Entry not found' });
        res.json({ deleted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
