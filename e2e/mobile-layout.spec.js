import { test, expect } from "@playwright/test";
import { installApiMocks, signIn, BOOKINGS } from "./fixtures.js";

/**
 * Phone-width regression gate.
 *
 * A single non-wrapping row in the page header (view toggle + Create booking +
 * Refresh = 432px) widened the mobile layout viewport to 449px on a 360px
 * screen. That produced the reported sideways scroll, and every `fixed`
 * overlay inherited the widened viewport, so the create drawer opened 89px
 * wider than the phone and its footer button sat off-screen.
 *
 * These assertions fail on that, not on a screenshot: they measure the
 * document and the drawer against the viewport the browser actually laid out.
 */

const PHONE_WIDTHS = [320, 360, 390, 414];

const ROWS = Array.from({ length: 10 }, (_, i) => ({
  ...BOOKINGS[i % BOOKINGS.length],
  id: `mobile-row-${i}`,
  bookingNumber: `TRG-2000000${i}-2026-01`,
}));

function body(data) {
  return {
    status: 200,
    headers: {
      "access-control-allow-origin": "*",
      "content-type": "application/json",
    },
    body: JSON.stringify({ status: "success", data }),
  };
}

/**
 * The default fixtures leave supplier-created bookings off, which is why the
 * Create booking button and its overflow never had E2E coverage.
 */
async function installPhoneMocks(page) {
  await installApiMocks(page, {
    "/settings/team/my-role": ({ route }) =>
      route.fulfill(
        body({
          role: "OWNER",
          roles: ["OWNER"],
          permissions: ["*"],
          isOwner: true,
          storefronts: ["GHANA"],
          supplierCreatedBookings: true,
        }),
      ),
    "/finance/commission-cover": ({ route }) =>
      route.fulfill(
        body({ usable: true, currencies: [{ currency: "USD", available: 500 }] }),
      ),
    // `BOOKINGS` detail needs a real id; the list rows below are clones, so
    // answer the detail request for them explicitly.
    "/travioghana/supplier/bookings/mobile-row-": ({ route, path }) =>
      route.fulfill(
        body({
          booking: {
            ...BOOKINGS[0],
            id: path.split("/").pop().split("?")[0],
            review: null,
          },
        }),
      ),
    "/travioghana/supplier/bookings": ({ route, path }) => {
      const tail = (path.split("/travioghana/supplier/bookings")[1] || "")
        .split("?")[0]
        .replace(/^\//, "");
      if (tail.split("/")[0]) return false;
      return route.fulfill(
        body({
          bookings: ROWS,
          summary: {
            totalRevenue: 5000,
            totalBookings: 48,
            counts: { CONFIRMED: 20, PENDING: 8, COMPLETED: 12, CANCELLED: 8 },
          },
          pagination: {
            currentPage: 1,
            totalPages: 5,
            totalCount: 48,
            limit: 10,
          },
        }),
      );
    },
  });
}

async function pageOverflow(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
}

async function expectNoPageOverflow(page, label) {
  const { clientWidth, scrollWidth } = await pageOverflow(page);
  expect(
    scrollWidth,
    `${label}: document is ${scrollWidth}px wide in a ${clientWidth}px viewport`,
  ).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("Bookings at phone widths", () => {
  for (const width of PHONE_WIDTHS) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await signIn(page);
      await installPhoneMocks(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/bookings");
      await expect(
        page.getByRole("heading", { name: "Bookings", exact: true }),
      ).toBeVisible();

      await expectNoPageOverflow(page, `bookings list @${width}`);

      // The primary action must be fully visible, not clipped by the edge it
      // used to push past.
      const create = page.getByRole("button", { name: /Create booking/ });
      await expect(create).toBeVisible();
      const box = await create.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);

      // Pagination collapses to a counter instead of five page buttons.
      await expect(page.getByText("1 / 5")).toBeVisible();
    });

    test(`create drawer fits at ${width}px`, async ({ page }) => {
      await signIn(page);
      await installPhoneMocks(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/bookings");
      await page.getByRole("button", { name: /Create booking/ }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // The panel slides in from the right. Measuring mid-spring would compare
      // the animation offset, not the layout.
      await expect
        .poll(() => dialog.evaluate((el) => getComputedStyle(el).transform))
        .toBe("none");

      const dialogBox = await dialog.boundingBox();
      expect(dialogBox.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width + 1);

      // The footer's primary action is the control that disappeared off-screen.
      const primary = dialog.getByRole("button", { name: /Continue/ });
      await expect(primary).toBeVisible();
      const primaryBox = await primary.boundingBox();
      expect(primaryBox.x + primaryBox.width).toBeLessThanOrEqual(width + 1);

      await expectNoPageOverflow(page, `create drawer @${width}`);

      // The list behind a full-screen drawer must not scroll with it.
      const bodyOverflow = await page.evaluate(
        () => getComputedStyle(document.body).overflow,
      );
      expect(bodyOverflow).toBe("hidden");
    });

    test(`booking detail drawer fits at ${width}px`, async ({ page }) => {
      await signIn(page);
      await installPhoneMocks(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/bookings");

      const row = page
        .getByRole("button", { name: new RegExp(ROWS[0].bookingNumber) })
        .first();
      await row.click();
      await page.getByRole("button", { name: /View details/ }).first().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect
        .poll(() => dialog.evaluate((el) => getComputedStyle(el).transform))
        .toBe("none");

      const box = await dialog.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);

      await expectNoPageOverflow(page, `booking detail @${width}`);
    });
  }
});
