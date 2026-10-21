import { test, expect } from '@playwright/test';
import { installApiMocks, signIn } from './fixtures.js';

/**
 * Route-level smoke coverage: every primary page must render its own heading
 * for a signed-in owner. This is deliberately shallow — deep behaviour lives
 * beside the feature — but it catches the two failure modes that matter for a
 * release: a page crashing behind the shell, and a route that no longer exists.
 */
const PAGES = [
  { path: '/bookings', heading: 'Bookings' },
  { path: '/products', heading: 'Products' },
  { path: '/availability', heading: 'Availability' },
  { path: '/finance', heading: 'Finance' },
  { path: '/analytics', heading: /analytics|performance/i },
  { path: '/reviews', heading: 'Reviews' },
  { path: '/settings', heading: /settings/i },
];

for (const { path, heading } of PAGES) {
  test(`renders ${path}`, async ({ page }) => {
    await signIn(page);
    await installApiMocks(page, {
      // Availability is a calendar over the supplier's tours, so it needs a
      // tour to render at all.
      '/travioghana/supplier/tours': ({ route }) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      }),
      '/tours/tour-1/availability': ({ route }) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { tour: { id: 'tour-1' }, calendar: [] } }),
      }),
    });
    await page.goto(path);

    await expect(
      page.getByRole('heading', { name: heading, level: 1 }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveTitle(/Travio Ghana/i);
  });
}

test('unknown routes render the 404 page, not a blank shell', async ({ page }) => {
  await signIn(page);
  await installApiMocks(page);
  await page.goto('/this-route-does-not-exist');

  await expect(page.getByText(/page not found|404/i).first()).toBeVisible();
});

test('signed-out visitors are sent to login', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/bookings');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
});
