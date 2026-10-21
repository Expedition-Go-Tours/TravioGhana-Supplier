import { test, expect } from '@playwright/test';
import { installApiMocks, signIn } from './fixtures.js';

/**
 * "Block a date range" — the bulk close-dates flow on the Availability page.
 *
 * The API applies a batch ALL-OR-NOTHING and refuses a range holding a live
 * booking, so the panel's job is to send every date in the range and to make a
 * refusal unmistakable: the supplier must never believe dates were closed when
 * nothing changed.
 */
const CALENDAR = {
  status: 'success',
  data: {
    tour: { id: 'tour-1', title: 'Shai Hills Safari' },
    calendar: [],
  },
};

const TOURS = {
  status: 'success',
  data: {
    tours: [
      {
        id: 'tour-1',
        title: 'Shai Hills Safari',
        status: 'ACTIVE',
        productContent: { options: [] },
      },
    ],
  },
};

async function openAvailability(page, overrides = {}) {
  await installApiMocks(page, {
    // Specific routes first: the matcher takes the first fragment that fits,
    // and `/tours/tour-1/availability` is a prefix of `/…availability/batch`.
    ...overrides,
    '/travioghana/supplier/tours': ({ route }) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TOURS),
    }),
    '/tours/tour-1/availability': ({ route }) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CALENDAR),
    }),
  });
  await page.goto('/availability');
  await expect(page.getByRole('heading', { name: 'Availability', level: 1 })).toBeVisible();
}

test.describe('Blocking a date range', () => {
  test('sends every date in the range as one batch', async ({ page }) => {
    const batches = [];
    await signIn(page);
    await openAvailability(page, {
      '/tours/tour-1/availability/batch': ({ route, request }) => {
        batches.push(JSON.parse(request.postData() || '{}'));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', data: { results: [] } }),
        });
      },
    });

    await page.getByRole('button', { name: /block a date range/i }).click();
    await page.getByLabel('From', { exact: true }).fill('2026-11-01');
    await page.getByLabel('To', { exact: true }).fill('2026-11-03');

    // The button names the exact number of dates before anything is sent.
    await expect(page.getByRole('button', { name: /block 3 dates/i })).toBeVisible();
    await page.getByRole('button', { name: /block 3 dates/i }).click();

    await expect.poll(() => batches.length).toBe(1);
    expect(batches[0].updates).toEqual([
      { date: '2026-11-01', status: 'BLOCKED' },
      { date: '2026-11-02', status: 'BLOCKED' },
      { date: '2026-11-03', status: 'BLOCKED' },
    ]);
    await expect(page.getByText(/blocked 3 dates/i)).toBeVisible();
  });

  test('a refused batch says nothing changed, and shows why', async ({ page }) => {
    await signIn(page);
    await openAvailability(page, {
      '/tours/tour-1/availability/batch': ({ route }) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'fail',
            message:
              'Cannot block 2026-11-02 — 2 travellers already booked. Only dates with no existing bookings can be blocked.',
          }),
        }),
    });

    await page.getByRole('button', { name: /block a date range/i }).click();
    await page.getByLabel('From', { exact: true }).fill('2026-11-01');
    await page.getByLabel('To', { exact: true }).fill('2026-11-03');
    await page.getByRole('button', { name: /block 3 dates/i }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Nothing was changed.');
    await expect(alert).toContainText('2 travellers already booked');
  });

  test('a reversed range cannot be submitted', async ({ page }) => {
    await signIn(page);
    await openAvailability(page);

    await page.getByRole('button', { name: /block a date range/i }).click();
    await page.getByLabel('From', { exact: true }).fill('2026-11-05');
    await page.getByLabel('To', { exact: true }).fill('2026-11-01');

    await expect(page.getByText(/start date must be before the end date/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Block dates', exact: true })).toBeDisabled();
  });
});
