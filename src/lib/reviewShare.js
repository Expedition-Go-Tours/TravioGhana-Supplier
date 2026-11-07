/**
 * Validation for the public review-link copy page.
 *
 * The page receives the review URL in a query parameter, so it must never
 * display or copy an arbitrary destination: a trusted supplier-dashboard link
 * that forwards anywhere is a phishing surface. Only review URLs on the
 * storefronts this dashboard serves are accepted.
 */
import { TOUR_PLATFORMS } from "@/lib/platforms";

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function hostsFor(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    const bare = host.replace(/^www\./, "");
    return [bare, `www.${bare}`];
  } catch {
    return [];
  }
}

export const ALLOWED_REVIEW_HOSTS = new Set(
  TOUR_PLATFORMS.flatMap((platform) => hostsFor(platform.baseUrl)),
);

/**
 * @param {string|null|undefined} raw
 * @returns {{ url: string } | { error: "missing" | "invalid" }}
 */
export function parseReviewLink(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { error: "missing" };

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "invalid" };
  }

  // Credentials in a URL are never part of a real review link, and they are a
  // classic way to make a hostile host look familiar in a browser bar.
  if (parsed.username || parsed.password) return { error: "invalid" };

  const host = parsed.hostname.toLowerCase();
  const devHost = import.meta.env.DEV && DEV_HOSTS.has(host);
  const secure = parsed.protocol === "https:" || (devHost && parsed.protocol === "http:");
  if (!secure) return { error: "invalid" };
  if (!ALLOWED_REVIEW_HOSTS.has(host) && !devHost) return { error: "invalid" };
  if (!parsed.pathname.startsWith("/review/")) return { error: "invalid" };

  // Return the original text, not URL.toString(): the copied value must match
  // exactly what the review email contained, including its query parameters.
  return { url: value };
}
