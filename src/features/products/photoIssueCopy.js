/**
 * Plain-language explanation for one audited photo.
 *
 * The audit stores a machine verdict (`portrait`, `too-small`,
 * `soft-on-desktop`). This turns that into something a supplier can act on,
 * naming the real pixel size, because "photo quality" alone tells nobody what
 * to do differently.
 */

import { IDEAL_PHOTO_WIDTH, MIN_PHOTO_WIDTH } from "@/features/products/photoRules";

const PROBLEMS = {
  portrait: {
    label: "Needs attention",
    tone: "urgent",
    title: "This photo is portrait",
    describe: ({ width, height }) =>
      `${width}×${height} is taller than it is wide. Every gallery tile is landscape, so the storefront crops this down the middle and usually cuts off the subject. Replace it with the landscape original.`,
  },
  "too-small": {
    label: "Needs attention",
    tone: "urgent",
    title: "This photo is too small",
    describe: ({ width, height }) =>
      `${width}×${height} is below the ${MIN_PHOTO_WIDTH}px width the gallery needs. A phone tile scales it up, so it looks soft next to the others. Upload the larger original if you still have it.`,
  },
  "soft-on-desktop": {
    label: "Sharper?",
    tone: "soft",
    title: "This photo is soft on desktop",
    describe: ({ width, height }) =>
      `${width}×${height} looks fine on a phone, but the large desktop gallery scales it up and it loses detail. Not urgent — replace it when you have a copy at least ${IDEAL_PHOTO_WIDTH}px wide.`,
  },
};

/** Copy for one stored issue, tolerant of an unknown problem code. */
export function describePhotoIssue(issue) {
  const width = Number(issue?.width) || 0;
  const height = Number(issue?.height) || 0;
  const known = PROBLEMS[issue?.problem];

  if (!known) {
    return {
      label: "Check this photo",
      tone: "urgent",
      title: "This photo needs checking",
      body: "The storefront may crop or upscale it. Re-upload a landscape photo at least 1280px wide.",
      size: width && height ? `${width}×${height}` : null,
    };
  }

  return {
    label: known.label,
    tone: known.tone,
    title: known.title,
    body: known.describe({ width, height }),
    size: width && height ? `${width}×${height}` : null,
  };
}

/**
 * Cloudinary URLs differ by transform segment between callers, so the exact
 * string is tried first and the public id (the last path segment) second.
 */
function photoKey(url) {
  if (!url) return "";
  const clean = String(url).split("?")[0];
  const last = clean.split("/").pop() || clean;
  return last.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

/** url → issue, keyed both by the stored URL and by its public id. */
export function indexPhotoIssues(issues) {
  const map = new Map();
  if (!Array.isArray(issues)) return map;

  for (const issue of issues) {
    if (!issue?.url) continue;
    map.set(issue.url, issue);
    const key = photoKey(issue.url);
    if (key && !map.has(key)) map.set(key, issue);
  }

  return map;
}

export function findPhotoIssue(index, url) {
  if (!index || !url) return null;
  return index.get(url) || index.get(photoKey(url)) || null;
}
