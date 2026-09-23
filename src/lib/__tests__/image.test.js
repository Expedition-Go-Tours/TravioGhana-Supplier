import { describe, it, expect } from 'vitest';
import {
  transformImage,
  getSrcSet,
  buildBreakpoints,
  lightboxImageUrls,
  LIGHTBOX_IMAGE,
} from '../image';

const CLOUDINARY =
  'https://res.cloudinary.com/demo/image/upload/v1790110559/user-photos/hz123.jpg';

describe('buildBreakpoints', () => {
  it('offers 1x/1.5x/2x/3x candidates', () => {
    expect(buildBreakpoints(1600)).toEqual([1600, 2400, 3200, 4800]);
  });
});

describe('lightboxImageUrls', () => {
  it('matches what OptimizedImage renders for the same box width', () => {
    const urls = lightboxImageUrls(CLOUDINARY);
    const opts = { width: LIGHTBOX_IMAGE.width * 2, quality: 'auto:good', format: 'auto' };

    expect(urls.src).toBe(transformImage(CLOUDINARY, opts));
    expect(urls.srcSet).toBe(getSrcSet(CLOUDINARY, buildBreakpoints(LIGHTBOX_IMAGE.width), opts));
  });

  it('requests an uncropped, width-capped image', () => {
    const urls = lightboxImageUrls(CLOUDINARY);

    expect(urls.src).toContain('w_3200');
    expect(urls.src).toContain('q_auto:good');
    expect(urls.src).toContain('f_auto');
    // No `c_` transform: the viewer shows the whole photo, never a crop.
    expect(urls.src).not.toMatch(/c_[a-z]/);
  });

  it('offers every breakpoint in the srcSet, at that width', () => {
    const urls = lightboxImageUrls(CLOUDINARY);
    const expected = [1600, 2400, 3200, 4800]
      .map(
        (w) =>
          `${transformImage(CLOUDINARY, { width: w, quality: 'auto:good', format: 'auto' })} ${w}w`,
      )
      .join(', ');

    expect(urls.srcSet).toBe(expected);
    expect(urls.srcSet.split(', ')).toHaveLength(4);
  });

  it('passes non-Cloudinary sources through without a srcSet', () => {
    const google = 'https://lh3.googleusercontent.com/abc=w1000';
    const urls = lightboxImageUrls(google);

    expect(urls.src).toBe(google);
    expect(urls.srcSet).toBeUndefined();
  });

  it('returns null without a usable url', () => {
    expect(lightboxImageUrls(null)).toBeNull();
    expect(lightboxImageUrls(undefined)).toBeNull();
    expect(lightboxImageUrls('')).toBeNull();
  });
});
