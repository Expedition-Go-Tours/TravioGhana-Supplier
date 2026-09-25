#!/usr/bin/env node
/**
 * Verifies the dashboard alignment invariant: every page's content must start
 * on the same left edge as the header logo (see src/components/layout/shell.js).
 *
 *   BASE_URL=http://localhost:4173 \
 *   SUPPLIER_EMAIL=you@example.com SUPPLIER_PASSWORD=secret \
 *   npm run check:alignment
 *
 * Optional: WIDTHS=1440,1920,2560
 *
 * Routes that legitimately cover the viewport (product builder) or centre
 * themselves (404) are reported as skipped.
 */
import { chromium } from "@playwright/test";

const BASE_URL = (process.env.BASE_URL || "https://supplier.travioghana.com").replace(/\/+$/, "");
const EMAIL = process.env.SUPPLIER_EMAIL;
const PASSWORD = process.env.SUPPLIER_PASSWORD;
const WIDTHS = (process.env.WIDTHS || "1440,1920,2560")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(Boolean);

if (!EMAIL || !PASSWORD) {
  console.error("Set SUPPLIER_EMAIL and SUPPLIER_PASSWORD (and optionally BASE_URL, WIDTHS).");
  process.exit(2);
}

/** Content of the page container starts at its padded left edge. */
const PAGE_ROOT = "main > div > *:first-child";
/** Detail page: its chrome lives inside a full-bleed root. */
const DETAIL_ROOT = "main > div > *:first-child > div:first-child > div:first-child";

const ROUTES = [
  { path: "/", name: "Dashboard" },
  { path: "/bookings", name: "Bookings" },
  { path: "/pickup-planner", name: "Pickup planner" },
  { path: "/availability", name: "Availability" },
  { path: "/products", name: "Products" },
  { path: "/reviews", name: "Reviews" },
  { path: "/finance", name: "Finance" },
  { path: "/notifications", name: "Notifications" },
  { path: "/verification", name: "Verification" },
  { path: "/settings", name: "Settings" },
  { path: "/analytics", name: "Analytics" },
  { path: "/cancellation-rate", name: "Cancellation rate" },
  { path: "/special-offers", name: "Special offers" },
  { path: "/special-offers/build/new", name: "Special offer builder" },
  { path: "/chat", name: "Chat" },
  { path: "PRODUCT_DETAIL", name: "Product detail", probe: DETAIL_ROOT },
  { path: "/products/build/new", name: "Product builder", skip: "full-screen takeover, covers the header" },
  { path: "/this-route-does-not-exist", name: "404", skip: "intentionally centred full-screen" },
];

const failures = [];
const rows = [];

/** Prefer the system Chrome (no download); fall back to Playwright's browser. */
async function launchBrowser() {
  const candidates = [{ channel: "chrome" }, { channel: "msedge" }, {}];
  let lastError;
  for (const options of candidates) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('form button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60000 });
  await page.waitForSelector("header", { timeout: 30000 });

  // Find a real product id for the detail page.
  await page.goto(`${BASE_URL}/products`, { waitUntil: "domcontentloaded" });
  const title = page.locator("main h3[title]").first();
  let productPath = null;
  try {
    await title.waitFor({ state: "visible", timeout: 30000 });
    await title.click();
    await page.waitForURL(/\/products\/[^/]+/, { timeout: 30000 });
    productPath = new URL(page.url()).pathname;
  } catch {
    console.warn("! no product found — skipping the product detail route");
  }

  const measure = (probe) =>
    page.evaluate((selector) => {
      const logo = document.querySelector('header img[alt="Travio Ghana"]');
      const element = document.querySelector(selector);
      if (!element) return { error: `probe not found: ${selector}` };
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const pad = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.paddingLeft) || 0);
      return {
        logoLeft: logo ? Math.round(logo.getBoundingClientRect().left) : null,
        contentLeft: Math.round(rect.left + pad),
      };
    }, probe);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });

    for (const route of ROUTES) {
      const path = route.path === "PRODUCT_DETAIL" ? productPath : route.path;
      if (!path) continue;

      if (route.skip) {
        rows.push({ width, name: route.name, logo: "-", content: "-", delta: "-", note: `skipped: ${route.skip}` });
        continue;
      }

      const probe = route.probe || PAGE_ROOT;
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(probe, { state: "attached", timeout: 30000 });
        await page.waitForFunction(
          () => document.fonts?.status === "loaded",
          undefined,
          { timeout: 10000 },
        ).catch(() => {});
        await page.waitForTimeout(400);

        const result = await measure(probe);
        if (result.error) throw new Error(result.error);
        if (result.logoLeft === null) throw new Error("header logo not found");

        const delta = result.contentLeft - result.logoLeft;
        const ok = Math.abs(delta) <= 1;
        if (!ok) failures.push({ width, name: route.name, path, ...result, delta });
        rows.push({ width, name: route.name, logo: result.logoLeft, content: result.contentLeft, delta, note: ok ? "ok" : "MISALIGNED" });
      } catch (error) {
        failures.push({ width, name: route.name, path, error: String(error.message || error) });
        rows.push({ width, name: route.name, logo: "-", content: "-", delta: "-", note: `error: ${error.message || error}` });
      }
    }
  }
} finally {
  await browser.close();
}

const pad = (value, size) => String(value).padEnd(size);
const padStart = (value, size) => String(value).padStart(size);

console.log(`\nAlignment report — ${BASE_URL}\n`);
console.log(`${pad("width", 6)} ${pad("page", 22)} ${padStart("logo", 6)} ${padStart("content", 8)} ${padStart("delta", 6)}   note`);
console.log("-".repeat(72));
for (const row of rows) {
  console.log(
    `${pad(row.width, 6)} ${pad(row.name, 22)} ${padStart(row.logo, 6)} ${padStart(row.content, 8)} ${padStart(row.delta, 6)}   ${row.note}`,
  );
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} misaligned page(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure.width}px ${failure.name} (${failure.path}): ${failure.error || `content ${failure.contentLeft} vs logo ${failure.logoLeft}`}`);
  }
  process.exit(1);
}

console.log("\n✓ every page starts on the header logo's left edge");
