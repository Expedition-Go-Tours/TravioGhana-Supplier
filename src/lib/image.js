export function optimizeImage(urlOrObj) {
  return transformImage(urlOrObj);
}

export function transformImage(urlOrObj, opts = {}) {
  const url = typeof urlOrObj === 'string' ? urlOrObj : urlOrObj?.url || urlOrObj;
  if (!url || typeof url !== 'string') return urlOrObj;

  if (url.includes('googleusercontent.com') || url.includes('googleapis.com')) return url;

  if (url.includes('res.cloudinary.com')) {
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;

    const base = url.slice(0, idx + marker.length);
    const after = url.slice(idx + marker.length);

    const parts = after.split('/');
    let version = '';
    let path = [];
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (/^v\d+$/i.test(seg)) {
        version = seg + '/';
        path = parts.slice(i + 1);
        break;
      }
      if (!seg.includes('_')) {
        path = parts.slice(i);
        break;
      }
    }

    const transforms = [];
    if (opts.crop) transforms.push(`c_${opts.crop}`);
    if (opts.width) transforms.push(`w_${opts.width}`);
    if (opts.height) transforms.push(`h_${opts.height}`);
    if (opts.quality) transforms.push(`q_${opts.quality}`);
    if (opts.format) transforms.push(`f_${opts.format}`);

    if (transforms.length === 0) {
      transforms.push('q_auto', 'f_auto');
    }

    const pathStr = path.join('/');
    return `${base}${transforms.join(',')}/${version}${pathStr}`;
  }

  return url;
}

export function getSrcSet(url, widths, opts = {}) {
  if (!url || !widths || widths.length === 0) return '';
  return widths
    .map((w) => {
      const img = transformImage(url, { ...opts, width: w });
      return `${img} ${w}w`;
    })
    .join(', ');
}

/** The candidate widths a `width`-wide box offers, at 1x/1.5x/2x/3x. */
export function buildBreakpoints(width) {
  return [width, Math.round(width * 1.5), width * 2, Math.round(width * 3)];
}

/**
 * The photo lightbox's image size. Kept in one place because the prefetcher and
 * the viewer must request byte-identical URLs — if either one drifts (even a
 * quality flag), the prefetch becomes a separate cache entry and the "next"
 * click pays full load time again.
 */
export const LIGHTBOX_IMAGE = { width: 1600 };

/**
 * The exact `src`/`srcSet` the lightbox uses for one photo. The prefetcher
 * (see `@/lib/prefetchImages`) warms these, and `PhotoGalleryModal` renders
 * these, so the two cannot disagree.
 */
export function lightboxImageUrls(url) {
  if (!url || typeof url !== 'string') return null;

  const opts = {
    width: LIGHTBOX_IMAGE.width * 2,
    quality: 'auto:good',
    format: 'auto',
  };

  const src = transformImage(url, opts);
  if (!src || typeof src !== 'string') return null;

  return {
    src,
    // Only Cloudinary (and googleusercontent, which passes through untouched)
    // can honour width transforms; anything else gets a single plain URL.
    srcSet: url.includes('res.cloudinary.com')
      ? getSrcSet(url, buildBreakpoints(LIGHTBOX_IMAGE.width), opts)
      : undefined,
  };
}
