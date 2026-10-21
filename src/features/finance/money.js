import { formatCurrency } from "@/lib/utils";

/**
 * Display helpers for money that may span currencies.
 *
 * Money is never summed across currencies: GH₵200 and $200 are two balances,
 * not $400. The finance summary therefore only carries a scalar `amount` for
 * single-currency accounts — with two currencies it is null and these helpers
 * list each currency instead. `—` always means "unknown right now", never
 * "zero": a failed fetch must never read as an empty balance.
 */

function rowsOf(summary) {
  if (Array.isArray(summary?.byCurrencyList)) return summary.byCurrencyList;
  if (Array.isArray(summary?.byCurrency)) return summary.byCurrency;
  return [];
}

/** One display line: "$1,200.00" or "GH₵200.00 · $100.00". */
export function moneyLine(summary) {
  const rows = rowsOf(summary);

  if (rows.length > 1) {
    return rows.map((row) => formatCurrency(row.amount, row.currency)).join(" · ");
  }
  if (summary?.amount != null) {
    return formatCurrency(summary.amount, summary.currency || "USD");
  }
  if (rows.length === 1) {
    return formatCurrency(rows[0].amount, rows[0].currency || "USD");
  }
  return "—";
}

/**
 * Numeric total across the summary's currencies, for eligibility checks only
 * ("is there anything to request?"). Never display this: it is a number no
 * account holds when currencies are mixed.
 */
export function moneyTotal(summary) {
  const rows = rowsOf(summary);
  if (rows.length === 0) {
    // Single-currency summaries carry only the scalar; treat it as the total.
    return Number(summary?.amount || 0);
  }
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

/** True when at least one currency holds a positive amount. */
export function hasPositiveAmount(summary) {
  return (
    rowsOf(summary).some((row) => Number(row.amount) > 0) ||
    Number(summary?.amount || 0) > 0
  );
}
