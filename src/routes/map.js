const router = require('express').Router();
const { MapPosition } = require('../models/mapPosition');
const { User } = require('../models/user');
const { assignMapPosition, findAvailablePosition } = require('../utils/mapPlacement');

/**
 * Resolve the public handle for each positioned User.
 * `entityName` holds the username at assignment time (see utils/mapPlacement), but a
 * rename would make it stale, so the User record is the source of truth with
 * `entityName` as the fallback. Communities are not visited by handle.
 */
async function resolveUserHandles(positions) {
  const userPositions = positions.filter((p) => p.entityType === 'User' && p.entityId);
  if (!userPositions.length) return new Map();

  const users = await User.find(
    { _id: { $in: userPositions.map((p) => p.entityId) } },
    'username first_name last_name'
  ).lean();

  const byId = new Map(users.map((u) => [String(u._id), u]));
  const handles = new Map();
  userPositions.forEach((p) => {
    const user = byId.get(String(p.entityId));
    const username = (user && user.username) || p.entityName || null;
    const fullName = [user && user.first_name, user && user.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    handles.set(String(p._id), { username, name: fullName || username });
  });
  return handles;
}

// GET /api/map — every positioned entity, shaped for the jungle map client.
// Single contract: { users: [{ id, username, name, gridX, gridY }], communities: [...] }.
router.get('/', async (req, res) => {
  try {
    const positions = await MapPosition.find().lean();
    const handles = await resolveUserHandles(positions);

    const users = positions
      .filter((p) => p.entityType === 'User')
      .map((p) => {
        const handle = handles.get(String(p._id)) || {};
        return {
          id: handle.username || String(p.entityId),
          username: handle.username || null,
          name: handle.name || p.entityName,
          gridX: p.gridX,
          gridY: p.gridY,
        };
      });

    const communities = positions
      .filter((p) => p.entityType === 'Community')
      .map((p) => ({
        id: String(p.entityId),
        name: p.entityName,
        gridX: p.gridX,
        gridY: p.gridY,
      }));

    res.json({ success: true, data: { users, communities } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/map/assign-position — manually trigger position assignment
router.post('/assign-position', async (req, res) => {
  try {
    const { entityId, entityType = 'User', entityName } = req.body;
    if (!entityId || !entityName) return res.status(400).json({ success: false, error: 'entityId and entityName required' });

    const existing = await MapPosition.findOne({ entityId, entityType });
    if (existing) return res.json({ success: true, position: existing, message: 'Already assigned' });

    const allPositions = await MapPosition.find({}, 'gridX gridY').lean();
    const { gridX, gridY } = findAvailablePosition(allPositions);
    const pos = await MapPosition.create({ entityId, entityType, entityName, gridX, gridY, assignmentType: 'auto' });
    res.json({ success: true, position: pos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/map/update-position — manual drag/reposition
router.put('/update-position', async (req, res) => {
  try {
    const { entityId, entityType = 'User', gridX, gridY } = req.body;
    const pos = await MapPosition.findOneAndUpdate(
      { entityId, entityType },
      { gridX, gridY, assignmentType: 'manual' },
      { new: true, upsert: false }
    );
    if (!pos) return res.status(404).json({ success: false, error: 'Position not found' });
    res.json({ success: true, position: pos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

exports.mapRouter = router;
