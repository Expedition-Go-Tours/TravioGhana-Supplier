/**
 * Social media platforms for the supplier's public business profile.
 *
 * Each platform stores a full URL under `storeKey` inside the business
 * profile's `businessInfo` JSON. `storeKey` keeps compatibility with the
 * existing fields (e.g. the "X" platform persists under the legacy `twitter`
 * key so previously-saved data and the public site keep working).
 */
import {
  XIcon,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  LinkedInIcon,
  WhatsAppIcon,
  PinterestIcon,
} from "./SocialBrandIcons";

export const SOCIAL_PLATFORMS = [
  { storeKey: "twitter", name: "X", prefix: "https://x.com/", color: "#000000", Icon: XIcon, hint: "your username" },
  { storeKey: "instagram", name: "Instagram", prefix: "https://instagram.com/", color: "#E4405F", Icon: InstagramIcon, hint: "your username" },
  { storeKey: "facebook", name: "Facebook", prefix: "https://facebook.com/", color: "#1877F2", Icon: FacebookIcon, hint: "your page or username" },
  { storeKey: "tiktok", name: "TikTok", prefix: "https://www.tiktok.com/@", color: "#000000", Icon: TikTokIcon, hint: "your @username" },
  { storeKey: "youtube", name: "YouTube", prefix: "https://youtube.com/@", color: "#FF0000", Icon: YouTubeIcon, hint: "your channel handle" },
  { storeKey: "linkedin", name: "LinkedIn", prefix: "https://www.linkedin.com/in/", color: "#0A66C2", Icon: LinkedInIcon, hint: "your profile slug" },
  { storeKey: "whatsapp", name: "WhatsApp", prefix: "https://wa.me/", color: "#25D366", Icon: WhatsAppIcon, hint: "international number, e.g. 233241234567" },
  { storeKey: "pinterest", name: "Pinterest", prefix: "https://www.pinterest.com/", color: "#BD081C", Icon: PinterestIcon, hint: "your username" },
];

export function platformForStoreKey(storeKey) {
  return SOCIAL_PLATFORMS.find((p) => p.storeKey === storeKey);
}

/** Extract the handle part from a stored URL for a given platform. */
export function extractHandle(platform, url) {
  if (!url) return "";
  return url.replace(platform.prefix, "").replace(/\/+$/, "");
}

/** Build the full URL from a platform prefix + handle. */
export function buildSocialUrl(platform, handle) {
  return `${platform.prefix}${handle.trim().replace(/^@/, "")}`;
}
