/**
 * Capture Stays screenshots for one target.
 *
 *   node scripts/stays-parity/capture.mjs --target=implementation
 *   node scripts/stays-parity/capture.mjs --target=reference
 *   node scripts/stays-parity/capture.mjs --target=implementation --only=dashboard --widths=1440
 *
 * Files land in scripts/stays-parity/output/ as
 *   <state>-<width>-<target>.png
 *
 * Reference = the signed-off prototype (set STAYS_PROTOTYPE if it is not in
 * ~/Downloads). Implementation = the dev server at STAYS_APP_URL.
 */
import { chromium } from "playwright";
import { join } from "node:path";
import {
  APP_URL,
  OUTPUT_DIR,
  STATES,
  WIDTHS,
  ensureOutputDir,
  prepareImplementation,
  servePrototype,
} from "./lib.mjs";

function parseArgs() {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );
  return {
    target: args.get("target") || "implementation",
    only: args.get("only") ? args.get("only").split(",") : null,
    widths: args.get("widths")
      ? args.get("widths").split(",").map(Number)
      : WIDTHS,
    fullPage: args.get("fullPage") !== "false",
  };
}

async function main() {
  const { target, only, widths, fullPage } = parseArgs();
  if (!["implementation", "reference"].includes(target)) {
    throw new Error(`Unknown target "${target}" — use reference or implementation.`);
  }

  ensureOutputDir();
  const states = STATES.filter((state) => !only || only.includes(state.id));
  const browser = await chromium.launch({ channel: "chrome" });

  let server = null;
  const baseUrl = target === "reference" ? (server = await servePrototype()).url : APP_URL;

  const page = await browser.newPage({ viewport: { width: widths[0], height: 950 } });
  if (target === "implementation") await prepareImplementation(page);

  for (const state of states) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 950 });
      const url = target === "reference" ? baseUrl : `${baseUrl}${state.path}`;
      await page.goto(url, { waitUntil: "load" });
      await page.waitForTimeout(target === "reference" ? 900 : 1100);

      if (target === "reference" && state.referenceCode) {
        await page.evaluate(state.referenceCode);
        await page.waitForTimeout(350);
      }
      if (state.setup) {
        await page.evaluate(state.setup);
        await page.waitForTimeout(250);
      }

      const file = join(OUTPUT_DIR, `${state.id}-${width}-${target}.png`);
      await page.screenshot({ path: file, fullPage });
      console.log(`captured ${state.id} @${width} → ${file}`);
    }
  }

  await browser.close();
  if (server) server.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
