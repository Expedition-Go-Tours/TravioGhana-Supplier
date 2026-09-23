import { lightboxImageUrls } from './image';

/**
 * Warm the photo lightbox's images while the page is idle, so "next"/"prev" in
 * "View all photos" paints from cache instead of starting a fresh Cloudinary
 * request on every click.
 *
 * Uses the exact `src`/`srcSet` the lightbox requests (see `lightboxImageUrls`),
 * and sets no `sizes` on either side, so the browser resolves the same candidate
 * and every prefetch is a guaranteed cache hit. Runs at idle priority so it
 * never competes with the gallery's first paint, and is skipped entirely for
 * data-saver users — the lightbox still loads on demand for them.
 *
 * @param {(string|null|undefined)[]} sources photo URLs
 * @returns {() => void} cleanup that cancels a still-pending prefetch
 */
export function prefetchLightboxImages(sources) {
  const urls = (sources || []).map(lightboxImageUrls).filter(Boolean);
  if (typeof window === 'undefined' || urls.length === 0) return () => {};

  // Respect the user's data-saver preference.
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && connection.saveData) return () => {};

  const warm = () => {
    for (const { src, srcSet } of urls) {
      const img = new Image();
      img.decoding = 'async';
      if (srcSet) img.srcset = srcSet;
      img.src = src;
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(warm, { timeout: 1500 });
    return () => window.cancelIdleCallback && window.cancelIdleCallback(handle);
  }

  const timer = window.setTimeout(warm, 800);
  return () => window.clearTimeout(timer);
}
