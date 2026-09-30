/**
 * Shared plumbing for the Stays parity harness.
 *
 * The harness captures the signed-off prototype (the reference) and the
 * implementation at the same viewports, then builds a side-by-side report.
 * See capture.mjs for usage.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const ROOT = resolve(process.cwd());
export const OUTPUT_DIR = join(ROOT, "scripts", "stays-parity", "output");

/** Where the prototype lives. Override with STAYS_PROTOTYPE=/abs/path.html */
export const PROTOTYPE_PATH =
  process.env.STAYS_PROTOTYPE ||
  join(homedir(), "Downloads", "TravioGhana_Stays_Dashboard_Prototype.html");

/** Implementation dev server. Override with STAYS_APP_URL. */
export const APP_URL = process.env.STAYS_APP_URL || "http://127.0.0.1:5173";

/** Default viewport set, widest first. */
export const WIDTHS = (process.env.STAYS_WIDTHS || "1440,1024,768,390")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter(Boolean);

/**
 * One state = one page of the workspace.
 *
 *  referenceCode   what to run in the prototype's console to show the page
 *  path            the implementation route
 *  setup           optional extra page.evaluate before the shot
 */
export const STATES = [
  { id: "dashboard", label: "Dashboard", referenceCode: "view = 'Overview'; render();", path: "/stays" },
  { id: "properties", label: "Properties", referenceCode: "view = 'Properties'; render();", path: "/stays/properties" },
  { id: "bookings", label: "Bookings", referenceCode: "view = 'Reservations'; render();", path: "/stays/bookings" },
  { id: "availability", label: "Availability", referenceCode: "view = 'Calendar'; render();", path: "/stays/availability" },
  { id: "rates", label: "Rates & availability", referenceCode: "view = 'Rates & availability'; render();", path: "/stays/rates" },
  { id: "rooms", label: "Rooms & units", referenceCode: "view = 'Rooms & units'; render();", path: "/stays/rooms" },
  { id: "policies", label: "Policies", referenceCode: "view = 'Policies'; render();", path: "/stays/policies" },
  { id: "offers", label: "Special Offers", referenceCode: "view = 'Promotions'; render();", path: "/stays/special-offers" },
  { id: "cancellation", label: "Cancellation", referenceCode: "view = 'Cancellation rate'; render();", path: "/stays/cancellation" },
];

/** Serves the prototype file over http so the browser can open it. */
export async function servePrototype() {
  if (!existsSync(PROTOTYPE_PATH)) {
    throw new Error(
      `Prototype not found at ${PROTOTYPE_PATH} — set STAYS_PROTOTYPE to its path.`,
    );
  }
  const html = readFileSync(PROTOTYPE_PATH);
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}/`, close: () => server.close() };
}

/**
 * Seeds the session and stubs the supplier API so authed pages render without
 * a backend. Shared pages (finance, reviews, …) receive empty payloads and
 * show their own empty states — enough for chrome screenshots.
 */
export async function prepareImplementation(page) {
  const supplierProfile = {
    id: "sup-preview",
    status: "ACTIVE",
    businessName: "Expedition-Go Tours LTD",
    supplierSince: "2021-03-04T00:00:00.000Z",
    logoUrl: null,
    businessInfo: {
      operatingInfo: { services: ["Accommodation", "Tours & Activities"] },
    },
  };

  await page.addInitScript((profile) => {
    const user = {
      id: "user-preview",
      name: "Gideon Kwarteng",
      email: "owner@example.com",
      roles: ["supplier"],
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    localStorage.setItem("auth_token", "preview-token");
    localStorage.setItem("auth_user", JSON.stringify(user));
    localStorage.setItem("refresh_token", "preview-refresh");
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: { user, token: "preview-token", isAuthenticated: true, supplierProfile: profile },
        version: 0,
      }),
    );
    localStorage.setItem(
      "stays-workspace",
      JSON.stringify({
        state: { workspace: "stays", userOverride: true, activePropertyId: null },
        version: 0,
      }),
    );
  }, supplierProfile);

  await page.route("**/apiv1.travioafrica.com/**", async (route) => {
    const url = route.request().url();
    const json = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });

    if (url.includes("/suppliers/application/status")) {
      return json({ supplierProfile, verificationRequirements: null });
    }
    // NB: axios rewrites `/suppliers/settings/**` to
    // `/travioghana/supplier/settings/**` before the request leaves the app,
    // so match the tail rather than the whole path.
    if (url.includes("settings/team/my-role")) {
      return json({ role: "admin", roles: ["admin"], permissions: ["*"], isOwner: true });
    }
    if (url.includes("/notifications")) {
      return json({ notifications: [], unreadCount: 0, total: 0 });
    }
    return json({});
  });
}

export function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}
