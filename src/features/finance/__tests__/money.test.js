/**
 * Money rendering on the Finance page.
 *
 * Two rules the page has already broken:
 *  1. Money is never summed across currencies. GH₵200 and $200 are two
 *     balances; there is no $400 in that account.
 *  2. An unknown amount renders as "—", never as $0.00. A supplier who cannot
 *     tell "nothing there" from "we could not load it" will file a support
 *     ticket or, worse, believe they were paid nothing.
 */
import { describe, expect, it } from 'vitest';
import { moneyLine, moneyTotal, hasPositiveAmount } from '../money';

describe('moneyLine', () => {
  it('formats a single-currency summary from its scalar amount', () => {
    expect(moneyLine({ amount: 1200, currency: 'USD', byCurrency: [] })).toBe('$1,200.00');
  });

  it('lists each currency instead of inventing a total', () => {
    const line = moneyLine({
      amount: null,
      currency: null,
      byCurrency: [
        { currency: 'GHS', amount: 200 },
        { currency: 'USD', amount: 100 },
      ],
    });

    expect(line).toContain('GHS');
    expect(line).toContain('200.00');
    expect(line).toContain('$100.00');
    // The one thing it must never do is add the two together.
    expect(line).not.toContain('300');
  });

  it('reads a byCurrencyList when the summary is the in-review shape', () => {
    const line = moneyLine({
      total: null,
      byCurrencyList: [
        { currency: 'USD', amount: 40 },
        { currency: 'EUR', amount: 25 },
      ],
    });

    expect(line).toContain('$40.00');
    expect(line).toContain('€25.00');
  });

  it('renders an em dash when nothing is known — never zero', () => {
    expect(moneyLine(null)).toBe('—');
    expect(moneyLine({ amount: null, byCurrency: [] })).toBe('—');
  });
});

describe('moneyTotal / hasPositiveAmount', () => {
  it('falls back to the scalar for single-currency summaries', () => {
    expect(moneyTotal({ amount: 42.5, currency: 'USD', byCurrency: [] })).toBe(42.5);
  });

  it('sums rows only for eligibility checks', () => {
    const summary = {
      amount: null,
      byCurrency: [
        { currency: 'GHS', amount: 200 },
        { currency: 'USD', amount: 100 },
      ],
    };
    expect(moneyTotal(summary)).toBe(300);
    expect(hasPositiveAmount(summary)).toBe(true);
  });

  it('knows the difference between zero and unknown', () => {
    expect(hasPositiveAmount({ amount: 0, byCurrency: [] })).toBe(false);
    // Unknown must not be treated as "nothing to request" in a way that hides
    // the reason: the caller renders the failure banner, and this stays false
    // because no positive amount is KNOWN to exist.
    expect(hasPositiveAmount({ amount: null, byCurrency: [] })).toBe(false);
  });
});
