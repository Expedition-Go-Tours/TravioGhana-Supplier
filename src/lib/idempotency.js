/**
 * Client-side idempotency keys for money-moving writes.
 *
 * The supplier dashboard is a single-page app on a flaky connection: a payout
 * request or refund submission that times out is invisible to the user, who
 * then presses the button again. Without a key the backend sees two unrelated
 * submissions and has to guess. With a key, the two requests are recognisably
 * the same attempt.
 *
 * The key is generated per ATTEMPT (not per form) and sent as an
 * `Idempotency-Key` header, which is the standard header Stripe and the
 * payment side of this platform already read. Retrying with the same key must
 * replay the first response instead of creating a second record.
 */

const SESSION_ID = randomishId();

function randomishId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * `newIdempotencyKey('payout-request')` → a key that is unique per attempt but
 * stable if the caller re-uses it for a deliberate retry of the same action.
 */
export function newIdempotencyKey(scope = 'mutation') {
  return `${scope}:${SESSION_ID}:${randomishId()}`;
}

/**
 * Axios config fragment for a write that must never double-apply.
 *
 * `idempotent: true` is the axios.js opt-in that lets a retryable network error
 * be retried with the SAME key (see src/lib/axios.js): the retry replays one
 * logical attempt rather than creating a second one.
 */
export function withIdempotencyKey(scope, key = newIdempotencyKey(scope)) {
  return {
    idempotent: true,
    headers: {
      'Idempotency-Key': key,
      'X-Idempotency-Key': key,
    },
  };
}
