import { test, expect } from '@playwright/test';
import { installApiMocks, signIn, BOOKINGS } from './fixtures.js';

/**
 * Bookings is the supplier's highest-frequency workflow, so the release gate
 * covers the three things that broke repeatedly: the quick filter must reach
 * the API (not just the URL), the page must render every returned booking, and
 * a filtered result must not claim the supplier has no bookings at all.
 */
test.describe('Bookings', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await installApiMocks(page);
    await page.goto('/bookings');
  });

  test('renders the booking list with server-provided rows', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bookings', exact: true })).toBeVisible();
    await expect(page.getByText(BOOKINGS[0].bookingNumber).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(BOOKINGS[1].bookingNumber).filter({ visible: true }).first()).toBeVisible();
  });

  test('quick filters are reflected in the URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Confirmed', exact: true }).click();
    await expect(page).toHaveURL(/tab=CONFIRMED/);
  });

  test('quick filters are sent to the server, not applied page-locally', async ({ page }) => {
    const statusRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/travioghana/supplier/bookings')) {
        statusRequests.push(new URL(request.url()).searchParams.get('status'));
      }
    });

    await page.getByRole('button', { name: 'Pending', exact: true }).click();
    await expect.poll(() => statusRequests.filter(Boolean).at(-1)).toBe('PENDING');
  });

  test('search is sent to the server after a short debounce', async ({ page }) => {
    const searchRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/travioghana/supplier/bookings')) {
        searchRequests.push(new URL(request.url()).searchParams.get('search'));
      }
    });

    await page.getByPlaceholder(/search name, reference or tour/i).fill('Kwame');
    await expect.poll(() => searchRequests.filter((value) => value === 'Kwame').length).toBeGreaterThan(0);
    await expect(page).toHaveURL(/search=Kwame/);
    await expect(page.getByText(BOOKINGS[0].bookingNumber).filter({ visible: true }).first()).toBeVisible();
  });

  test('a filtered empty list does not say the supplier has no bookings', async ({ page }) => {
    await page.getByPlaceholder(/search name, reference or tour/i).fill('zzzz-no-match');
    await expect(page.getByText(/no bookings match/i)).toBeVisible();
    await expect(page.getByText(/bookings will appear here once customers/i)).toHaveCount(0);
  });
});
