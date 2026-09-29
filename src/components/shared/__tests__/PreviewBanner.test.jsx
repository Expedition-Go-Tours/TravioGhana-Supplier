import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewBanner from '../PreviewBanner';
import {
  detectPreview,
  STAGING_HOSTNAME,
  PREVIEW_BANNER_TEXT,
} from '@/lib/previewEnvironment';
import { config } from '@/config';

const OFFSET_VAR = '--preview-banner-height';

describe('detectPreview', () => {
  it('returns null on the production site', () => {
    expect(detectPreview('supplier.travioghana.com')).toBeNull();
  });

  it('returns null on localhost so development stays quiet', () => {
    expect(detectPreview('localhost')).toBeNull();
    expect(detectPreview('127.0.0.1')).toBeNull();
  });

  it('recognises the fixed staging domain', () => {
    expect(detectPreview(STAGING_HOSTNAME)).toBe('staging-domain');
  });

  it('recognises a per-branch Vercel preview', () => {
    expect(
      detectPreview('travio-ghana-supplier-git-feat-x-alice.vercel.app'),
    ).toBe('vercel-preview');
  });

  it('does not mistake an unrelated host for a Vercel preview', () => {
    expect(detectPreview('evil.vercel.app.example.com')).toBeNull();
    expect(detectPreview('notvercel.app')).toBeNull();
  });

  it('does not match the staging domain by accident on the real site', () => {
    expect(detectPreview(`www.${STAGING_HOSTNAME}`)).toBeNull();
  });

  it('prefers the explicit staging env flag over any hostname', () => {
    const spy = vi.spyOn(config, 'isStaging').mockReturnValue(true);
    expect(detectPreview('supplier.travioghana.com')).toBe('app-env');
    spy.mockRestore();
  });
});

describe('<PreviewBanner />', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty(OFFSET_VAR);
  });

  it('renders nothing on the real site', () => {
    const { container } = render(<PreviewBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(document.documentElement.style.getPropertyValue(OFFSET_VAR)).toBe('');
  });

  it('shows the banner when staging is flagged', () => {
    vi.spyOn(config, 'isStaging').mockReturnValue(true);

    render(<PreviewBanner />);

    const region = screen.getByRole('region', { name: 'Preview environment' });
    expect(region).toHaveTextContent(PREVIEW_BANNER_TEXT);
    expect(region).toHaveAttribute('data-preview-reason', 'app-env');
  });

  it('warns that the preview writes to real data', () => {
    vi.spyOn(config, 'isStaging').mockReturnValue(true);

    render(<PreviewBanner />);

    const region = screen.getByRole('region', { name: 'Preview environment' });
    expect(region).toHaveTextContent('connected to production data');
    expect(region).toHaveTextContent('affect real suppliers');
  });

  it('raises the offset Header and Sidebar read', () => {
    vi.spyOn(config, 'isStaging').mockReturnValue(true);

    render(<PreviewBanner />);

    // jsdom reports a height of 0, but the property must be driven from JS so a
    // wrapped banner on a phone can move the header down with it.
    expect(
      document.documentElement.style.getPropertyValue(OFFSET_VAR),
    ).not.toBe('');
  });

  it('clears the offset again on unmount', () => {
    vi.spyOn(config, 'isStaging').mockReturnValue(true);

    const { unmount } = render(<PreviewBanner />);
    expect(document.documentElement.style.getPropertyValue(OFFSET_VAR)).not.toBe('');

    unmount();
    expect(document.documentElement.style.getPropertyValue(OFFSET_VAR)).toBe('');
  });

  it('is not dismissible', () => {
    vi.spyOn(config, 'isStaging').mockReturnValue(true);

    const { container } = render(<PreviewBanner />);

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[aria-label*="ismiss"]')).toBeNull();
  });
});
