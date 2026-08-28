/**
 * Tier-range normalisation helpers.
 *
 * Group/vehicle pricing (GetYourGuide style) uses contiguous participant bands.
 * The base (Tier 1) band is always `1 to N` — by convention a single-person
 * group (`1 to 1`) — and every following band starts at `previous.to + 1`.
 *
 * Tiers saved by older clients (or edited in divergent states) can come back
 * overlapping, gapped, or with `to` values beyond `maxParticipants` (e.g.
 * `1 to 2 / 2 to 2 / 3 to 100`). `normalizeCategoryTiers` repairs that load
 * data to a canonical, contiguous shape while leaving intentionally-edited,
 * already-contiguous tiers untouched.
 */

const DEFAULT_MAX = 10

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Returns a *canonical* copy of a category's tier list.
 *
 *  - If every tier already satisfies the contiguity rules
 *    (`tier0.from === 1`, each `tier.from === prev.to + 1`,
 *    each `tier.to >= tier.from`, final band's `to === maxParticipants`),
 *    the tiers are returned unchanged (shallow-copied) so deliberate user
 *    edits — e.g. widening Tier 1 to `1 to 3` — survive a reload.
 *  - Otherwise the divergent list is rewritten to the `addCategoryTier`
 *    shape: `1 to 1`, `2 to 2`, …, `N to maxParticipants`, preserving each
 *    tier's `pricePerPerson` and `id` by position.
 *
 * @param {Array<{from?:number,to?:number,pricePerPerson?:number,id?:string}>} tiers
 * @param {number} maxParticipants
 * @returns {Array}
 */
export function normalizeCategoryTiers(tiers, maxParticipants) {
  if (!Array.isArray(tiers) || tiers.length === 0) return []

  const mp = toNum(maxParticipants) >= 1 ? toNum(maxParticipants) : DEFAULT_MAX

  const isContiguous = tiers.every((t, i, arr) => {
    const from = toNum(t && t.from)
    const to = toNum(t && t.to)
    if (!Number.isFinite(from) || !Number.isFinite(to)) return false
    if (to < from) return false
    if (i === 0 && from !== 1) return false
    if (i > 0 && from !== toNum(arr[i - 1].to) + 1) return false
    if (i === arr.length - 1 && to !== mp) return false
    return true
  })

  // Already valid — preserve the user's exact bands.
  if (isContiguous) return tiers.map((t) => ({ ...t }))

  // Divergent / overlapping / gapped legacy data → canonicalise.
  return tiers.map((t, i) => ({
    ...t,
    from: i + 1,
    to: i === tiers.length - 1 ? mp : i + 1,
  }))
}

/**
 * Re-derives a category's tier bands to stay contiguous after a live range
 * edit (GetYourGuide group-pricing convention).
 *
 * Rules:
 *  - The base tier always starts at 1.
 *  - Every tier after the edited one starts at `prev.to + 1` and is
 *    single-unit (`to === from`) unless it is the final band.
 *  - The final band is always pinned to `maxParticipants` so the chain
 *    covers `1..max` with no gaps.
 *  - An edited `to` is silently clamped to `[1, maxParticipants]`.
 *  - A cleared `to` (null / non-numeric) is treated as reaching
 *    `maxParticipants`.
 *  - Any trailing tier whose `from` would exceed `maxParticipants` after
 *    clamping is dropped (zero-width band).
 *  - `pricePerPerson` and `id` are preserved by slot.
 *
 * @param {Array<{from?:number,to?:number,pricePerPerson?:number,id?:string}>} tiers
 * @param {number} tierIndex Index of the tier being edited.
 * @param {{from?:number,to?:number}} edits The new range for that tier.
 * @param {number} maxParticipants
 * @returns {Array}
 */
export function rederiveTiersFrom(tiers, tierIndex, edits, maxParticipants) {
  const mp = toNum(maxParticipants) >= 1 ? toNum(maxParticipants) : DEFAULT_MAX
  const target = tiers[tierIndex]
  if (!target) return Array.isArray(tiers) ? tiers.map((t) => ({ ...t })) : []

  const next = tiers.map((t) => ({ ...t }))
  const edited = next[tierIndex]

  let editedTo
  if (edits && edits.to === null) {
    editedTo = mp
  } else if (edits && edits.to !== undefined) {
    editedTo = toNum(edits.to)
    if (!Number.isFinite(editedTo)) {
      editedTo = mp
    } else {
      editedTo = Math.max(1, Math.min(mp, editedTo))
    }
  } else {
    editedTo = toNum(edited.to)
    if (!Number.isFinite(editedTo)) editedTo = mp
    editedTo = Math.max(1, Math.min(mp, editedTo))
  }
  if (edits && edits.from !== undefined) {
    edited.from = toNum(edits.from)
    if (!Number.isFinite(edited.from)) edited.from = tierIndex === 0 ? 1 : (tiers[tierIndex - 1].to ?? 0) + 1
    edited.from = Math.max(1, Math.floor(edited.from))
  }
  if (edited.from == null) {
    edited.from = tierIndex === 0 ? 1 : (tiers[tierIndex - 1].to ?? 0) + 1
  }
  edited.to = Math.max(edited.to ?? edited.from, editedTo)

  const out = next.slice(0, tierIndex + 1)
  let prevTo = edited.to

  for (let i = tierIndex + 1; i < next.length; i++) {
    const from = prevTo + 1
    if (from > mp) break
    const isLast = i === next.length - 1
    const to = isLast ? mp : from
    out.push({ ...next[i], from, to })
    prevTo = to
  }

  const last = out[out.length - 1]
  if (last) last.to = mp

  return out
}

/**
 * Normalises the tier ranges of every pricing category in a list, preserving
 * per-category metadata (name, age ranges, etc.).
 *
 * @param {Array<{tiers?:Array}>} categories
 * @param {number} maxParticipants
 * @returns {Array}
 */
export function normalizePricingCategories(categories, maxParticipants) {
  if (!Array.isArray(categories)) return []
  return categories.map((c) => ({
    ...c,
    name: (c && (c.name || c.label)) || '',
    tiers: normalizeCategoryTiers(c && c.tiers, maxParticipants),
  }))
}

/**
 * Re-derives per-group pricing tiers to stay contiguous after a live range edit.
 *
 * Rules:
 *  - Each tier's `from` must be `prev.to + 1` (no gaps, no overlaps).
 *  - `to` must be >= `from`.
 *  - Cascades forward and backward from the edited tier.
 *
 * @param {Array<{id:string,from:number,to:number,price?:number|null}>} groupSizes
 * @param {number} editedIndex Index of the tier being edited.
 * @param {{from?:number,to?:number}} edits The new range values.
 * @returns {Array}
 */
export function rederiveGroupSizesFrom(groupSizes, editedIndex, edits) {
  if (!Array.isArray(groupSizes) || groupSizes.length === 0) return []

  const sorted = [...groupSizes].sort((a, b) => (a.from ?? 0) - (b.from ?? 0))
  const edited = { ...sorted[editedIndex] }

  if (edits && edits.from !== undefined) {
    edited.from = Math.max(1, Math.floor(Number(edits.from) || 1))
  }
  if (edits && edits.to !== undefined) {
    edited.to = Math.max(1, Math.floor(Number(edits.to) || 1))
  }
  // Ensure to >= from
  if (edited.to < edited.from) edited.to = edited.from

  sorted[editedIndex] = edited

  // Cascade forward: each tier starts at prev.to + 1
  for (let i = editedIndex + 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const newFrom = prev.to + 1
    sorted[i] = { ...sorted[i], from: newFrom }
    if (sorted[i].to < sorted[i].from) sorted[i].to = sorted[i].from
  }

  // Cascade backward: each tier ends at next.from - 1
  for (let i = editedIndex - 1; i >= 0; i--) {
    const next = sorted[i + 1]
    const newTo = next.from - 1
    sorted[i] = { ...sorted[i], to: Math.max(sorted[i].from, newTo) }
  }

  return sorted
}
