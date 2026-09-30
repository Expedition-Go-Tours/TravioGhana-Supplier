/**
 * Label for the "Group Type" row on the product detail page.
 *
 * Reads `content.options[].isPrivate` — the flag the supplier's Step 12
 * "Is this a private activity?" pill writes — rather than
 * `content.isPrivateActivity`, a field with no control anywhere in the app
 * that therefore never leaves `false`.
 *
 * Falls back to `isPrivateActivity` when no option carries a usable flag, so
 * products without options behave exactly as they did before.
 *
 * @param {{ options?: Array<{ isPrivate?: boolean }>, isPrivateActivity?: boolean }} [content]
 * @returns {'Private' | 'Group' | 'Mixed'}
 */
export function groupTypeLabel(content) {
  const options = Array.isArray(content?.options) ? content.options : []
  const flagged = options.filter((o) => o && typeof o.isPrivate === 'boolean')

  if (flagged.length > 0) {
    const privates = flagged.filter((o) => o.isPrivate).length
    if (privates === flagged.length) return 'Private'
    if (privates === 0) return 'Group'
    return 'Mixed'
  }

  return content?.isPrivateActivity ? 'Private' : 'Group'
}
