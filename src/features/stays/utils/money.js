/**
 * Money formatting for the Stays workspace.
 *
 * The prototype prints "GHS 6,950" — hundreds-separated integers, no decimals
 * unless the value actually has a fraction. The currency code comes from the
 * API payload (defaults to GHS) so multi-currency accounts keep working when
 * the backend starts returning something else.
 */
export function formatMoney(amount, currency = "GHS") {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return `${currency} 0`;
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
  return `${currency} ${formatted}`;
}

/** For inline "per night" copy: `formatMoney(750)` → "GHS 750 / night". */
export function formatMoneyPerNight(amount, currency = "GHS") {
  return `${formatMoney(amount, currency)} / night`;
}
