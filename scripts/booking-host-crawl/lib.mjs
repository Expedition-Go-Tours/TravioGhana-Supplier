/**
 * Shared plumbing for the Booking.com host-flow crawl.
 *
 * The crawl opens the tokenized "become a host" flow in a real (headed) Chrome
 * profile, waits while the operator signs in, then snapshots every step the
 * flow exposes: screenshots at each width plus a structured dump of headings,
 * fields, options, CTAs and validation messages.
 *
 * Booking's flow is only ever read: the crawler never publishes, accepts terms
 * or submits the listing. Captures are local reference material (git-ignored)
 * used to mirror the step sequence in our own Stays builder — never shipped.
 */
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(process.cwd());
export const OUTPUT_DIR =
  process.env.BOOKING_CRAWL_OUT || join(ROOT, "scripts", "booking-host-crawl", "output");
export const AUTH_DIR =
  process.env.BOOKING_CRAWL_PROFILE || join(ROOT, "scripts", "booking-host-crawl", ".auth");

/**
 * The invitation link under test. It carries a token, so Booking lands on the
 * partner sign-in wall first and redirects back here after sign-in. Override
 * with BOOKING_HOST_URL.
 */
export const DEFAULT_URL =
  process.env.BOOKING_HOST_URL ||
  "https://join.booking.com/become-a-host/category.html?aid=355028&token=b2feb4d7a2c2b4eb70b72fa8e0680bb02569e3ec&waypoint_id=455449592";

/** Viewports captured for every step, widest first. */
export const WIDTHS = (process.env.BOOKING_CRAWL_WIDTHS || "1440,390")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(Boolean);

export function ensureDirs() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(AUTH_DIR, { recursive: true });
}

export const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

/** Console + file logger, so a backgrounded run can be read back later. */
export function createLogger() {
  const file = join(OUTPUT_DIR, "crawl.log");
  return (line) => {
    const text = `[${new Date().toISOString()}] ${line}`;
    console.log(text);
    try {
      appendFileSync(file, `${text}\n`);
    } catch {
      /* logging must never break the crawl */
    }
  };
}

export function slugify(value, fallback = "step") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

/** Hostname of a page, or "" while it is still about:blank. */
export function hostOf(page) {
  try {
    return new URL(page.url()).hostname;
  } catch {
    return "";
  }
}

/**
 * Pages that belong to the host journey we are documenting: the become-a-host
 * wizard on join.booking.com, and the property-setup screens it hands off to
 * on the Extranet (admin.booking.com/hotel/hoteladmin/extranet_ng). Sign-in,
 * dashboards, unrelated tabs and the wider Extranet are all ignored.
 */
export function isJourneyPage(page) {
  const host = hostOf(page);
  if (host === "join.booking.com") return true;
  if (host === "admin.booking.com") {
    try {
      const { pathname } = new URL(page.url());
      return pathname.includes("/extranet_ng/") || pathname.includes("become-a-host");
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * The page that matters: the Booking tab. Preference order is the signed-in
 * flow (join/admin/*.booking.com), then the sign-in wall, then the last tab.
 * Other sites — Gmail, opened for a verification link, say — are only chosen
 * when there is nothing else, and the callers refuse to capture them.
 */
export function pickFlowPage(context) {
  const pages = context.pages().filter((page) => !page.isClosed());
  if (!pages.length) return null;
  const flowPage = pages.find((page) => {
    const host = hostOf(page);
    return (
      host === "join.booking.com" ||
      host === "admin.booking.com" ||
      (host.endsWith(".booking.com") && host !== "account.booking.com")
    );
  });
  if (flowPage) return flowPage;
  return pages.find((page) => hostOf(page) === "account.booking.com") || pages[pages.length - 1];
}

/**
 * Waits until the signed-in host flow loads (sign-in + any OTP happen here)
 * and returns the wizard page on join.booking.com — sign-in can hand off to a
 * new tab, and Booking often drops hosts on the Extranet dashboard instead of
 * the invitation flow. When that happens, the token URL is reopened until the
 * wizard actually appears.
 */
export async function waitForHostFlow(
  context,
  { url, timeoutMs = 45 * 60 * 1000, log = console.log } = {},
) {
  const started = Date.now();
  let last = "";
  let lastReopen = 0;
  while (Date.now() - started < timeoutMs) {
    const pages = context.pages().filter((page) => !page.isClosed());
    const wizardPage = pages.find((page) => isJourneyPage(page));
    if (wizardPage) return wizardPage;

    const signedIn = pages.find((page) => {
      const host = hostOf(page);
      return host.endsWith(".booking.com") && host !== "account.booking.com";
    });
    if (signedIn && url && Date.now() - lastReopen > 15000) {
      log("signed in but the wizard is not open — reopening the invitation link");
      await signedIn
        .goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
        .catch(() => {});
      lastReopen = Date.now();
      await sleep(3000);
      continue;
    }

    const host = hostOf(pickFlowPage(context));
    const note = `waiting for sign-in — complete it in the Chrome window (${host || "loading"})`;
    if (note !== last) {
      log(note);
      last = note;
    }
    await sleep(2000);
  }
  throw new Error("Timed out waiting for Booking sign-in.");
}

/** A cheap fingerprint of "which step is on screen" — heading + visible labels. */
export async function stepSignature(page) {
  try {
    return await page.evaluate(() => {
      const text = (value) =>
        (typeof value === "string" ? value : value?.innerText || value?.textContent || "")
          .trim()
          .replace(/\s+/g, " ");
      const heading =
        text(document.querySelector("h1")) ||
        text(document.querySelector("h2")) ||
        text(document.querySelector("h3"));
      const labels = Array.from(document.querySelectorAll("label, legend"))
        .map((element) => text(element))
        .filter(Boolean)
        .slice(0, 12)
        .join(" | ");
      const progress =
        (document.body.innerText.match(/step\s+\d+\s*(?:of|\/)\s*\d+/i) || [])[0] || "";
      return [location.host, location.pathname, location.search, heading, labels, progress].join("::");
    });
  } catch {
    return "";
  }
}

/**
 * Everything worth knowing about the current step: headings, copy, fields
 * (with options and selected state), CTAs, progress and validation messages.
 * Runs entirely in the page, so it never depends on Booking's class names.
 */
async function extractStep(page) {
  return page.evaluate(() => {
    const text = (value) =>
      (typeof value === "string" ? value : value?.innerText || value?.textContent || "")
        .trim()
        .replace(/\s+/g, " ");
    const visible = (element) => element.getClientRects().length > 0;
    const labelFor = (element) => {
      const aria = element.getAttribute("aria-label");
      if (aria) return text(aria);
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const ref = document.getElementById(labelledBy.split(/\s+/)[0]);
        if (ref) return text(ref);
      }
      if (element.labels?.length) return text(element.labels[0]);
      const wrapping = element.closest("label");
      if (wrapping) return text(wrapping);
      const legend = element.closest("fieldset")?.querySelector("legend");
      if (legend) return text(legend);
      return "";
    };

    const headings = Array.from(document.querySelectorAll("h1, h2, h3")).map((heading) => ({
      tag: heading.tagName.toLowerCase(),
      text: text(heading).slice(0, 240),
      visible: visible(heading),
    }));

    const fields = [];
    const seenGroups = new Set();
    for (const element of Array.from(document.querySelectorAll("input, select, textarea"))) {
      if (!visible(element)) continue;
      const type = (element.type || "").toLowerCase();
      if (type === "hidden") continue;
      if ((type === "radio" || type === "checkbox") && element.name) {
        const key = `${type}:${element.name}`;
        if (seenGroups.has(key)) continue;
        seenGroups.add(key);
        const group = Array.from(
          document.querySelectorAll(`input[type="${type}"][name="${CSS.escape(element.name)}"]`),
        );
        fields.push({
          kind: type,
          name: element.name,
          label: labelFor(element),
          required: element.required || element.getAttribute("aria-required") === "true",
          options: group.map((item) => ({
            label: labelFor(item),
            value: item.value,
            checked: item.checked,
          })),
        });
        continue;
      }
      fields.push({
        kind: type || element.tagName.toLowerCase(),
        name: element.name || "",
        id: element.id || "",
        label: labelFor(element),
        placeholder: element.placeholder || "",
        required: element.required || element.getAttribute("aria-required") === "true",
        value: type === "password" ? "" : element.value || "",
        options:
          element.tagName === "SELECT"
            ? Array.from(element.options).map((option) => option.text.trim())
            : undefined,
      });
    }

    const buttons = Array.from(
      document.querySelectorAll("button, input[type=submit], [role=button], a[role=button]"),
    )
      .filter((element) => visible(element))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: (text(element) || element.value || element.getAttribute("aria-label") || "")
          .slice(0, 140),
        disabled: element.disabled || element.getAttribute("aria-disabled") === "true",
      }))
      .filter((button) => button.text);

    const alerts = Array.from(document.querySelectorAll("[role=alert], [aria-live]"))
      .map((element) => text(element))
      .filter(Boolean)
      .slice(0, 20);

    const progress =
      (document.body.innerText.match(/step\s+\d+\s*(?:of|\/)\s*\d+/i) || [])[0] || "";
    const progressBars = Array.from(document.querySelectorAll("[role=progressbar], progress")).map(
      (element) => ({
        value: element.value ?? element.getAttribute("aria-valuenow") ?? "",
        text: element.getAttribute("aria-valuetext") || "",
      }),
    );

    return {
      title: document.title,
      url: location.href,
      headings,
      fields,
      buttons,
      progress,
      progressBars,
      alerts,
      bodyText: text(document.body).slice(0, 8000),
    };
  });
}

/** Screenshots + JSON for the step currently on screen; appends to `steps`. */
export async function captureStep(page, index, { widths, steps }) {
  const extraction = await extractStep(page);
  const heading = extraction.headings.find((item) => item.visible && item.tag === "h1")?.text;
  const name = `${String(index).padStart(2, "0")}-${slugify(heading || extraction.title, `step-${index}`)}`;

  const screenshots = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 950 });
    await sleep(350);
    const file = `${name}-${width}.png`;
    await page.screenshot({ path: join(OUTPUT_DIR, file), fullPage: true });
    screenshots.push({ width, file, path: `scripts/booking-host-crawl/output/${file}` });
  }
  // Put the operator back on the desktop layout for the next step.
  if (widths[0] !== widths[widths.length - 1]) {
    await page.setViewportSize({ width: widths[0], height: 950 });
  }

  const data = {
    index,
    capturedAt: new Date().toISOString(),
    ...extraction,
    screenshots,
  };
  writeFileSync(join(OUTPUT_DIR, `${name}.json`), JSON.stringify(data, null, 2));
  steps.push(data);
  writeFileSync(join(OUTPUT_DIR, "steps.json"), JSON.stringify(steps, null, 2));
  writeSummary(steps);
  return data;
}

/** Human-readable roll-up of the run, next to the screenshots. */
export function writeSummary(steps) {
  const lines = [
    "# Booking.com host-flow crawl",
    "",
    `Captured ${steps.length} step(s) at ${new Date().toISOString()}`,
    "",
  ];
  for (const step of steps) {
    const heading =
      step.headings.find((item) => item.visible && item.tag === "h1")?.text ||
      step.headings.find((item) => item.visible)?.text ||
      step.title ||
      `Step ${step.index}`;
    lines.push(`## ${String(step.index).padStart(2, "0")} · ${heading}`, "");
    lines.push(`- URL: ${step.url}`);
    if (step.progress) lines.push(`- Progress: ${step.progress}`);
    if (step.alerts.length) lines.push(`- Alerts: ${step.alerts.join(" // ")}`);
    lines.push("", "**Fields**", "", "| Label | Kind | Required | Value | Options |", "| --- | --- | --- | --- | --- |");
    for (const field of step.fields) {
      const options = field.options
        ? field.options
            .slice(0, 30)
            .map((option) =>
              typeof option === "string"
                ? option
                : `${option.label || option.value}${option.checked ? " (selected)" : ""}`,
            )
            .join(", ")
        : "";
      lines.push(
        `| ${field.label || field.name || field.id || "—"} | ${field.kind || ""} | ${
          field.required ? "yes" : ""
        } | ${field.value ? String(field.value).slice(0, 40) : ""} | ${options.slice(0, 300)} |`,
      );
    }
    if (step.buttons.length) {
      lines.push(
        "",
        `**Actions:** ${step.buttons
          .map((button) => `${button.text}${button.disabled ? " (disabled)" : ""}`)
          .join(" · ")}`,
      );
    }
    lines.push(
      "",
      step.screenshots.map((shot) => `![${shot.width}px](${shot.file})`).join(" "),
      "",
    );
  }
  writeFileSync(join(OUTPUT_DIR, "SUMMARY.md"), lines.join("\n"));
}

export function outputExists() {
  return existsSync(OUTPUT_DIR);
}
