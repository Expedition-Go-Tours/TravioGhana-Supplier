/**
 * Retry safety on the shared axios instance.
 *
 * The response interceptor used to retry every request whose error looked
 * transient. On a supplier dashboard that is wrong for writes: a refund or a
 * cancellation whose response was lost to a dropped connection is invisible to
 * the user, who presses the button again — and the retry created a SECOND one.
 * Only idempotent requests (GET/HEAD/OPTIONS, or an explicit `idempotent:
 * true` opt-in) may be replayed.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import api from '@/lib/axios';
import config from '@/config';
import { withIdempotencyKey } from '@/lib/idempotency';

function networkFailureAdapter(calls) {
  return async (requestConfig) => {
    calls.push(requestConfig);
    const error = new Error('Network Error');
    error.config = requestConfig;
    error.request = {};
    throw error;
  };
}

describe('axios retry policy', () => {
  let calls;
  const originalAdapter = api.defaults.adapter;
  const originalAttempts = config.api.retryAttempts;

  beforeEach(() => {
    calls = [];
    api.defaults.adapter = networkFailureAdapter(calls);
    // One retry maximum keeps the test instant: the second attempt fails and
    // the call is rejected without waiting out the backoff.
    config.api.retryAttempts = 1;
    // A token exists so the auth guard lets the request reach the adapter.
    localStorage.setItem('auth_token', 'unit-test-token');
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    config.api.retryAttempts = originalAttempts;
    localStorage.removeItem('auth_token');
  });

  it('replays idempotent GETs after a network failure', async () => {
    await expect(
      api.get('/tours/supplier/my-tours', { skipGlobalErrorHandler: true }),
    ).rejects.toThrow('Network Error');

    expect(calls).toHaveLength(2);
  });

  it('never replays a POST without an idempotency opt-in', async () => {
    await expect(
      api.post('/disputes', { bookingId: 'b-1' }, { skipGlobalErrorHandler: true }),
    ).rejects.toThrow('Network Error');

    expect(calls).toHaveLength(1);
  });

  it('never replays a PATCH without an idempotency opt-in', async () => {
    await expect(
      api.patch('/bookings/b-1/status', { status: 'CANCELLED' }, { skipGlobalErrorHandler: true }),
    ).rejects.toThrow('Network Error');

    expect(calls).toHaveLength(1);
  });

  it('replays a write that carries an Idempotency-Key', async () => {
    await expect(
      api.post(
        '/finance/payout/request',
        {},
        { ...withIdempotencyKey('payout-request'), skipGlobalErrorHandler: true },
      ),
    ).rejects.toThrow('Network Error');

    expect(calls).toHaveLength(2);
    // The replay must be the SAME attempt: same key on every request.
    const keys = calls.map((requestConfig) => requestConfig.headers?.['Idempotency-Key']);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBeTruthy();
  });
});

describe('withIdempotencyKey', () => {
  it('mints one key per attempt', () => {
    const first = withIdempotencyKey('refund-request');
    const second = withIdempotencyKey('refund-request');

    expect(first.headers['Idempotency-Key']).toBeTruthy();
    expect(first.headers['Idempotency-Key']).not.toBe(second.headers['Idempotency-Key']);
    expect(first.idempotent).toBe(true);
    expect(first.headers['X-Idempotency-Key']).toBe(first.headers['Idempotency-Key']);
  });
});
