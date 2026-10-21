import { test, expect } from '@playwright/test';
import { installApiMocks, signIn, BOOKINGS } from './fixtures.js';

/**
 * The booking detail panel. It is URL-driven (?detail=<id>) so a supplier can
 * share a link to one booking and so Back closes the panel first — both of
 * which are easy to break silently in a drawer implementation.
 */
test.describe('Booking detail panel', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await installApiMocks(page);
    await page.goto('/bookings');
  });

  test('opens from a booking row and shows what the list cannot', async ({ page }) => {
    // Expand the first card (mobile + desktop headers both exist; one is enough).
    await page
      .getByRole('button', { name: /Shai Hills Safari/ })
      .first()
      .click();

    await page.getByRole('button', { name: /view details/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(BOOKINGS[0].bookingNumber);
    // Customer contact is detail-only: the list rows deliberately omit it.
    await expect(dialog).toContainText(BOOKINGS[0].customer.email);
    await expect(dialog).toContainText('Paid in full.');
  });

  test('puts the open booking in the URL', async ({ page }) => {
    await page.goto(`/bookings?detail=${BOOKINGS[0].id}`);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`detail=${BOOKINGS[0].id}`));
    await expect(page.getByRole('dialog')).toContainText(BOOKINGS[0].bookingNumber);
  });

  test('closes on Escape', async ({ page }) => {
    await page.goto(`/bookings?detail=${BOOKINGS[0].id}`);
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).not.toHaveURL(/detail=/);
  });

  test('a booking that cannot be loaded says so, with a way to retry', async ({ page }) => {
    await installApiMocks(page, {
      '/travioghana/supplier/bookings/missing-booking': ({ route }) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'fail', message: 'Kaboom' }),
        }),
    });

    await page.goto('/bookings?detail=missing-booking');

    await expect(page.getByText(/couldn't load this booking/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    // A stale or partial booking must never be rendered as if it were the row.
    await expect(page.getByRole('dialog')).not.toContainText('Kwame');
  });
});
