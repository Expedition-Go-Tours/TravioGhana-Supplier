import { test, expect } from '@playwright/test';
import { installApiMocks, signIn } from './fixtures.js';

/**
 * Export is generated SERVER-SIDE from the same filter set the list uses. Two
 * things worth pinning: the file downloads under the server's name, and the
 * request carries the filters currently on screen — an export that silently
 * drops the active filter is a spreadsheet of the wrong bookings.
 */
test.describe('Bookings export', () => {
  test('downloads a CSV named by the server', async ({ page }) => {
    await signIn(page);
    await installApiMocks(page, {
      '/travioghana/supplier/bookings/export': ({ route }) =>
        route.fulfill({
          status: 200,
          contentType: 'text/csv; charset=utf-8',
          headers: {
            'content-disposition': 'attachment; filename="travio-bookings-2026-10-21.csv"',
          },
          body: 'Reference,Status\r\nTRG-10000001-2026-01,CONFIRMED\r\n',
        }),
    });
    await page.goto('/bookings');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export csv/i }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('travio-bookings-2026-10-21.csv');
  });

  test('carries the filters currently on screen', async ({ page }) => {
    const exportRequests = [];
    await signIn(page);
    await installApiMocks(page, {
      '/travioghana/supplier/bookings/export': ({ route, request }) => {
        exportRequests.push(new URL(request.url()).searchParams);
        return route.fulfill({
          status: 200,
          contentType: 'text/csv; charset=utf-8',
          headers: {
            'content-disposition': 'attachment; filename="travio-bookings-2026-10-21.csv"',
          },
          body: 'Reference,Status\r\n',
        });
      },
    });

    await page.goto('/bookings?tab=CONFIRMED&search=Kwame&activityFrom=2026-11-01&activityTo=2026-11-30');
    await expect(
      page.getByText('Shai Hills Safari').filter({ visible: true }).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: /export csv/i }).click();
    await expect.poll(() => exportRequests.length).toBeGreaterThan(0);

    const params = exportRequests[0];
    expect(params.get('status')).toBe('CONFIRMED');
    expect(params.get('search')).toBe('Kwame');
    expect(params.get('activityFrom')).toBe('2026-11-01');
    expect(params.get('activityTo')).toBe('2026-11-30');
  });

  test('says the export failed instead of downloading nothing', async ({ page }) => {
    await signIn(page);
    await installApiMocks(page, {
      '/travioghana/supplier/bookings/export': ({ route }) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'fail', message: 'Export failed' }),
        }),
    });
    await page.goto('/bookings');

    await page.getByRole('button', { name: /export csv/i }).click();

    await expect(page.getByText(/failed to export bookings/i)).toBeVisible();
    // The button comes back, so the supplier can try again.
    await expect(page.getByRole('button', { name: /export csv/i })).toBeEnabled();
  });
});
