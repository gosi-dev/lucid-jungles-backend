const { MapPosition } = require('../models/mapPosition');

/**
 * Find a non-colliding grid position using spiral search from (preferX, preferY).
 * Users occupy a 3x3 total space (1x1 icon + 1 buffer each side).
 */
function checkCollision(ax, ay, bx, by) {
  // Both are users (totalSpace = 3, halfSpace = 1)
  return Math.abs(ax - bx) < 3 && Math.abs(ay - by) < 3;
}

function findAvailablePosition(existing, preferX = 0, preferY = 0) {
  // Check preferred first
  const taken = (x, y) => existing.some((p) => checkCollision(x, y, p.gridX, p.gridY));
  if (!taken(preferX, preferY)) return { gridX: preferX, gridY: preferY };

  // Spiral outward
  for (let radius = 3; radius <= 150; radius += 3) {
    for (let x = -radius; x <= radius; x += 3) {
      for (let y = -radius; y <= radius; y += 3) {
        if (Math.abs(x) === radius || Math.abs(y) === radius) {
          const cx = preferX + x;
          const cy = preferY + y;
          if (!taken(cx, cy)) return { gridX: cx, gridY: cy };
        }
      }
    }
  }
  // Fallback: random far-out position
  return { gridX: Math.round((Math.random() * 60 - 30) / 3) * 3, gridY: Math.round((Math.random() * 60 - 30) / 3) * 3 };
}

/**
 * Assign a map position to a new user. Idempotent — if already assigned, returns existing.
 */
async function assignMapPosition(userId, username) {
  const existing = await MapPosition.findOne({ entityId: userId, entityType: 'User' });
  if (existing) return existing;

  const allPositions = await MapPosition.find({}, 'gridX gridY').lean();
  const { gridX, gridY } = findAvailablePosition(allPositions);

  const pos = await MapPosition.create({
    entityId:   userId,
    entityType: 'User',
    entityName: username,
    gridX,
    gridY,
    assignmentType: 'auto',
  });
  return pos;
}

exports.assignMapPosition = assignMapPosition;
exports.findAvailablePosition = findAvailablePosition;
