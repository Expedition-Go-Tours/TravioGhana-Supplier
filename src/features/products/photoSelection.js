/**
 * Which photo rows to remove from the builder, as store indices.
 *
 * Removal is by INDEX into the live array, so the order matters: removing
 * index 1 shifts what used to be index 3 down to index 2. Walking the indices
 * in DESCENDING order keeps every later index valid, and no unselected photo
 * is ever touched. The old inline code removed "stale" indices forwards and
 * then walked the array again in reverse, which could delete photos the
 * supplier had not selected.
 */
export function removalIndices(photos, selectedIds) {
  return (photos || [])
    .map((photo, index) => (selectedIds.has(photo.id) ? index : -1))
    .filter((index) => index >= 0)
    .sort((a, b) => b - a);
}
