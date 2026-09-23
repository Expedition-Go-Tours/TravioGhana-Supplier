import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prefetchLightboxImages } from '../prefetchImages';
import { lightboxImageUrls } from '../image';

const PHOTOS = [
  'https://res.cloudinary.com/demo/image/upload/v1790110559/user-photos/a.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1790110500/user-photos/b.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1790110480/user-photos/c.jpg',
];

let created = [];

class ImageStub {
  constructor() {
    this.decoding = '';
    this.sizes = '';
    this.src = '';
    this.srcset = '';
    created.push(this);
  }
}

/** Run the idle callback synchronously, as the browser does once idle. */
function runIdleSynchronously() {
  vi.stubGlobal('requestIdleCallback', (cb) => {
    cb({ didTimeout: false, timeRemaining: () => 50 });
    return 1;
  });
  vi.stubGlobal('cancelIdleCallback', () => {});
}

beforeEach(() => {
  created = [];
  vi.stubGlobal('Image', ImageStub);
  runIdleSynchronously();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete navigator.connection;
});

describe('prefetchLightboxImages', () => {
  it('warms one image per photo, using the viewer’s exact urls', () => {
    prefetchLightboxImages(PHOTOS);

    expect(created).toHaveLength(PHOTOS.length);
    PHOTOS.forEach((photo, i) => {
      const expected = lightboxImageUrls(photo);
      // Identical src and srcSet is what makes this a cache hit rather than a
      // second download when the lightbox opens.
      expect(created[i].src).toBe(expected.src);
      expect(created[i].srcset).toBe(expected.srcSet);
    });
  });

  it('sets no `sizes`, so the browser resolves the same srcSet candidate as the viewer', () => {
    prefetchLightboxImages(PHOTOS);

    for (const img of created) expect(img.sizes).toBe('');
  });

  it('skips photos that cannot be resolved', () => {
    prefetchLightboxImages([null, undefined, '', ...PHOTOS]);

    expect(created).toHaveLength(PHOTOS.length);
  });

  it('does nothing without photos', () => {
    prefetchLightboxImages([]);
    prefetchLightboxImages(undefined);

    expect(created).toHaveLength(0);
  });

  it('does nothing when the user has data saver on', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    });

    prefetchLightboxImages(PHOTOS);

    expect(created).toHaveLength(0);
  });

  it('falls back to a timer without requestIdleCallback, and the cleanup cancels it', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.useFakeTimers();

    const cancel = prefetchLightboxImages(PHOTOS);
    expect(created).toHaveLength(0); // nothing until the timer fires

    cancel();
    vi.advanceTimersByTime(5000);

    expect(created).toHaveLength(0);
  });
});
