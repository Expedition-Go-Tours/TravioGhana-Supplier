#!/usr/bin/env node
/**
 * Walk Booking.com's "become a host" step builder and capture every step.
 *
 * Captures the wizard on join.booking.com and the Extranet property-setup
 * screens it hands off to on admin.booking.com, tracking every journey tab so
 * the walkthrough is captured wherever the operator happens to be.
 *
 *   npm run booking:crawl                # headed Chrome; capture each step
 *   npm run booking:crawl -- --auto      # also click Next/Continue when safe
 *   npm run booking:crawl -- --fresh     # forget the saved sign-in profile
 *   npm run booking:crawl -- --keep      # keep the previous run's captures
 *
 * Sign in when Chrome opens (the token URL lands on the partner sign-in wall).
 * Then step through the flow at your own pace — every new step is captured
 * automatically. Close the Chrome window when you are done.
 *
 * Safety: the crawler never clicks Publish / Agree / Accept / Confirm / Pay /
 * Submit, even in --auto mode, so a listing is only ever drafted, never sent.
 */
import { chromium } from "playwright";
import { existsSync, readFileSync, rmSync } from "node:fs";
import {
  AUTH_DIR,
  DEFAULT_URL,
  OUTPUT_DIR,
  WIDTHS,
  captureStep,
  createLogger,
  ensureDirs,
  isJourneyPage,
  sleep,
  stepSignature,
  waitForHostFlow,
} from "./lib.mjs";

const ADVANCE = /^(next|continue|save and continue|save & continue|save|ok|got it|done)$/i;
const FORBIDDEN = /publish|agree|accept|confirm|submit|pay|create account|activate|delete/i;

function parseArgs() {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );
  return {
    url: args.get("url") || DEFAULT_URL,
    auto: args.get("auto") === "true",
    fresh: args.get("fresh") === "true",
    keep: args.get("keep") === "true",
    widths: args.get("widths") ? args.get("widths").split(",").map(Number) : WIDTHS,
    timeoutMs: Number(args.get("timeout") || 45) * 60 * 1000,
  };
}

/** Prefer the system Chrome; fall back to Playwright's bundled Chromium. */
async function launchProfile(profileDir, viewport) {
  const candidates = [
    { channel: "chrome" },
    { channel: "msedge" },
    {},
  ];
  let lastError;
  for (const options of candidates) {
    try {
      return await chromium.launchPersistentContext(profileDir, {
        ...options,
        headless: false,
        viewport,
        ignoreDefaultArgs: ["--enable-automation"],
        args: ["--disable-blink-features=AutomationControlled"],
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Clicks an obvious "next" CTA when it is enabled. Final actions are never eligible. */
async function tryAdvance(page) {
  return page
    .evaluate(
      ({ advance, forbidden }) => {
        const label = (element) =>
          (element.innerText || element.value || element.getAttribute("aria-label") || "")
            .trim()
            .replace(/\s+/g, " ");
        const visible = (element) => element.getClientRects().length > 0;
        const buttons = Array.from(
          document.querySelectorAll("button, input[type=submit], [role=button]"),
        ).filter(
          (element) =>
            visible(element) &&
            !element.disabled &&
            element.getAttribute("aria-disabled") !== "true",
        );
        const target = buttons.find((element) => {
          const text = label(element);
          return new RegExp(advance, "i").test(text) && !new RegExp(forbidden, "i").test(text);
        });
        if (!target) return null;
        const text = label(target);
        target.click();
        return text;
      },
      { advance: ADVANCE.source, forbidden: FORBIDDEN.source },
    )
    .catch(() => null);
}

async function main() {
  const { url, auto, fresh, keep, widths, timeoutMs } = parseArgs();
  ensureDirs();
  if (fresh && existsSync(AUTH_DIR)) rmSync(AUTH_DIR, { recursive: true, force: true });
  if (!keep) {
    for (const file of ["steps.json", "SUMMARY.md", "crawl.log"]) {
      rmSync(`${OUTPUT_DIR}/${file}`, { force: true });
    }
  }
  const log = createLogger();

  // `--keep` resumes numbering from the last run's captures instead of
  // restarting at step 1.
  let steps = [];
  if (keep && existsSync(`${OUTPUT_DIR}/steps.json`)) {
    try {
      steps = JSON.parse(readFileSync(`${OUTPUT_DIR}/steps.json`, "utf8"));
      log(`resuming after ${steps.length} previous capture(s)`);
    } catch {
      steps = [];
    }
  }

  log(`opening ${url}`);
  log(`profile: ${AUTH_DIR}`);
  log(`output:  ${OUTPUT_DIR}`);
  const context = await launchProfile(AUTH_DIR, { width: widths[0], height: 950 });

  let page = context.pages()[0] || (await context.newPage());
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((error) => {
    log(`navigation warning: ${error.message}`);
  });

  page = await waitForHostFlow(context, { url, timeoutMs, log });
  await page.bringToFront().catch(() => {});
  log("signed in — step through the flow; each new step is captured automatically.");
  log("use THIS Chrome window (it was just brought to the front) for the walkthrough.");
  log("close the Chrome window when you are done.");

  // Every journey tab is tracked on its own, so it does not matter which tab
  // the walkthrough happens in — whichever page changes is the one captured.
  const signatures = new Map();
  const pendings = new Map();
  let closed = false;
  context.on("close", () => {
    closed = true;
  });

  const started = Date.now();
  while (!closed && Date.now() - started < timeoutMs) {
    const pages = context.pages().filter((candidate) => !candidate.isClosed());
    if (!pages.length) break;
    for (const candidate of pages) {
      if (!isJourneyPage(candidate)) continue;
      let signature = "";
      try {
        signature = await stepSignature(candidate);
      } catch {
        continue;
      }
      if (!signature) continue;

      if (signature === (signatures.get(candidate) || "")) {
        pendings.delete(candidate);
        continue;
      }
      const pending = pendings.get(candidate);
      if (!pending || pending.signature !== signature) {
        pendings.set(candidate, { signature, since: Date.now() });
        continue;
      }
      if (Date.now() - pending.since < 900) continue;

      signatures.set(candidate, signature);
      pendings.delete(candidate);
      // Background tabs can be throttled; front the page so screenshots never
      // hang on a page that is not rendering.
      await candidate.bringToFront().catch(() => {});
      try {
        const data = await captureStep(candidate, steps.length + 1, { widths, steps });
        const title = data.headings.find((item) => item.visible)?.text || data.title;
        log(`captured step ${data.index}: ${title}`);
      } catch (error) {
        log(`step capture failed: ${error.message}`);
      }
      if (auto) {
        const clicked = await tryAdvance(candidate);
        if (clicked) log(`auto-clicked "${clicked}"`);
        else log("no safe Next button found — fill this step in the browser");
      }
    }
    await sleep(500);
  }

  log(`crawl finished — ${steps.length} step(s) captured in ${OUTPUT_DIR}`);
  await context.close().catch(() => {});
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
