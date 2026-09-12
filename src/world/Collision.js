// Simple 2D (XZ) axis-aligned rectangle collision. Height is handled
// separately via low-ceiling zones that only apply when the player is
// standing (used for vent crawlspaces).

export function rect(minX, maxX, minZ, maxZ) {
  return { minX, maxX, minZ, maxZ };
}

export function circleOverlapsRect(x, z, radius, r) {
  return x + radius > r.minX && x - radius < r.maxX && z + radius > r.minZ && z - radius < r.maxZ;
}

// Blocks unless the player's head-top height is below r.minY (i.e. crouched).
export function circleOverlapsLowCeiling(x, z, radius, r, headTop) {
  if (headTop < r.minY) return false;
  return circleOverlapsRect(x, z, radius, r);
}

export function isBlocked(x, z, radius, wallRects, lowCeilingRects, headTop) {
  for (let i = 0; i < wallRects.length; i++) {
    if (circleOverlapsRect(x, z, radius, wallRects[i])) return true;
  }
  for (let i = 0; i < lowCeilingRects.length; i++) {
    if (circleOverlapsLowCeiling(x, z, radius, lowCeilingRects[i], headTop)) return true;
  }
  return false;
}
