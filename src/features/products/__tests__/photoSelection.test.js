/**
 * Photo deletion in the product builder's media step.
 *
 * Deleting rows by index while the array shifts under you is how unselected
 * photos get destroyed — a supplier's gallery is real business data. The
 * helper returns store indices in descending order so every removal leaves the
 * remaining indices valid and no unselected photo is ever touched.
 */
import { describe, expect, it } from 'vitest';
import { removalIndices } from '../photoSelection';

const photo = (id) => ({ id, url: `https://cdn/${id}.jpg` });
const photos = [photo('a'), photo('b'), photo('c'), photo('d'), photo('e')];

describe('removalIndices', () => {
  it('returns only the selected photos’ indices', () => {
    const indices = removalIndices(photos, new Set(['a', 'd']));
    expect(indices.sort((x, y) => x - y)).toEqual([0, 3]);
  });

  it('returns them highest-index first so shifting never re-targets a row', () => {
    // 'a' (0) and 'd' (3): removing 3 first leaves 'a' at index 0 untouched.
    expect(removalIndices(photos, new Set(['a', 'd']))).toEqual([3, 0]);
  });

  it('handles a selection of every photo', () => {
    const all = new Set(photos.map((p) => p.id));
    expect(removalIndices(photos, all)).toEqual([4, 3, 2, 1, 0]);
  });

  it('returns nothing when the selection is empty', () => {
    expect(removalIndices(photos, new Set())).toEqual([]);
  });

  it('never names an index for a photo that was not selected', () => {
    // The old inline code could delete 'b' and 'e' while only 'a' and 'd'
    // were selected; every returned index must be a selected row.
    const selected = new Set(['a', 'd']);
    const indices = removalIndices(photos, selected);
    for (const index of indices) {
      expect(selected.has(photos[index].id)).toBe(true);
    }
  });
});
