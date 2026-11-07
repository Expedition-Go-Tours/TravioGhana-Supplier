import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test/utils';
import ReviewLinkSharePage from '@/pages/ReviewLinkSharePage';

const REVIEW_URL =
  'https://www.travioghana.com/review/accra-shai-hills?bookingId=b1&tourId=t1';

const routeFor = (params) =>
  `/share/review-link?${new URLSearchParams(params).toString()}`;

function setClipboard(writeText) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

const ORIGINAL_EXEC = document.execCommand;

beforeEach(() => {
  setClipboard(vi.fn().mockResolvedValue(undefined));
});

afterEach(() => {
  setClipboard(undefined);
  if (ORIGINAL_EXEC) document.execCommand = ORIGINAL_EXEC;
  else delete document.execCommand;
  vi.restoreAllMocks();
});

describe('ReviewLinkSharePage', () => {
  it('copies the exact review URL and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    renderWithProviders(<ReviewLinkSharePage />, {
      route: routeFor({
        url: REVIEW_URL,
        guest: 'Priscilla Hankins',
        tour: 'Accra: Shai Hills Safari',
      }),
    });

    expect(
      screen.getByRole('heading', { name: /send the review link to priscilla hankins/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Accra: Shai Hills Safari')).toBeInTheDocument();
    expect(screen.getByTestId('review-url')).toHaveTextContent(REVIEW_URL);

    fireEvent.click(screen.getByRole('button', { name: /^copy link$/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(REVIEW_URL));
    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/link copied/i);
  });

  it('falls back to the legacy copy path when the Clipboard API is unavailable', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn(() => true);

    renderWithProviders(<ReviewLinkSharePage />, {
      route: routeFor({ url: REVIEW_URL }),
    });

    fireEvent.click(screen.getByRole('button', { name: /^copy link$/i }));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument();
  });

  it('accepts an Expedition storefront review link', () => {
    renderWithProviders(<ReviewLinkSharePage />, {
      route: routeFor({
        url: 'https://expeditiongotours.com/review/kakum?bookingId=b2',
      }),
    });

    expect(screen.getByTestId('review-url')).toHaveTextContent(
      'https://expeditiongotours.com/review/kakum?bookingId=b2',
    );
  });

  it('refuses a URL on a host this dashboard does not serve', () => {
    renderWithProviders(<ReviewLinkSharePage />, {
      route: routeFor({ url: 'https://evil.example/review/accra?bookingId=b1' }),
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/not valid/i);
    expect(screen.queryByRole('button', { name: /copy link/i })).toBeNull();
  });

  it('refuses a non-https review URL', () => {
    renderWithProviders(<ReviewLinkSharePage />, {
      route: routeFor({ url: 'http://www.travioghana.com/review/accra?bookingId=b1' }),
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/not valid/i);
  });

  it('explains when the link has no review URL at all', () => {
    renderWithProviders(<ReviewLinkSharePage />, { route: '/share/review-link' });

    expect(screen.getByRole('alert')).toHaveTextContent(/missing a review url/i);
    expect(screen.queryByRole('button', { name: /copy link/i })).toBeNull();
  });
});
