/**
 * The header search palette, with customers in it.
 *
 * The rule this pins: a name typed into ⌘K must find the person in bookings —
 * and only for a role that may see bookings at all. The palette is openable by
 * everyone, so it must not leak customer names to a role whose Bookings page
 * would be refused.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fetchSupplierBookings = vi.fn();
const hasPermission = vi.fn();

vi.mock('@/features/bookings/api', () => ({
  fetchSupplierBookings: (...args) => fetchSupplierBookings(...args),
}));
vi.mock('@/features/products/api', () => ({
  productsListQuery: () => ({
    queryKey: ['products', 'list'],
    queryFn: async () => ({ tours: [] }),
  }),
}));
vi.mock('@/features/products/tourSearch', () => ({
  searchTours: () => [],
  tourSubtitle: () => '',
}));
vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => ({ hasPermission: (...args) => hasPermission(...args) }),
}));
vi.mock('@/stores/authStore', () => ({ getAuthToken: () => 'test-token' }));
vi.mock('@/components/shared/OptimizedImage', () => ({
  default: (props) => <img alt="" {...props} />,
}));

import SearchDropdown from '../SearchDropdown';

const FUTURE = new Date(Date.now() + 10 * 86_400_000).toISOString();

const BOOKING_ROWS = [
  {
    id: 'b-1',
    bookingNumber: 'TRG-1',
    customerId: 'cust-1',
    customerName: 'Kwame Mensah',
    customerEmail: 'kwame@example.com',
    tourName: 'Shai Hills Safari',
    travelDate: FUTURE,
  },
  {
    id: 'b-2',
    bookingNumber: 'TRG-2',
    customerId: 'cust-1',
    customerName: 'Kwame Mensah',
    customerEmail: 'kwame@example.com',
    tourName: 'Kakum National Park',
    travelDate: FUTURE,
  },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPalette() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <SearchDropdown />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openAndType(text) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /search pages, products and customers/i }));
  await user.type(screen.getByPlaceholderText(/search pages, products/i), text);
  return user;
}

beforeEach(() => {
  fetchSupplierBookings.mockReset().mockResolvedValue({ bookings: BOOKING_ROWS, summary: null, pagination: null });
  hasPermission.mockReset().mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

describe('finding a customer in bookings', () => {
  it('shows one row per person under a Customers heading', async () => {
    renderPalette();
    await openAndType('Kwame');

    await waitFor(() => {
      expect(screen.getByText('Customers')).toBeInTheDocument();
    });
    // Two matching bookings, one face. The name is split across <mark>
    // segments by the query highlighter, so match on the row's full text.
    const nameNodes = screen.getAllByText(
      (_, node) => node?.textContent === 'Kwame Mensah',
    );
    expect(nameNodes).toHaveLength(1);
    // The email is what separates two people with the same name.
    expect(screen.getByText(/kwame@example\.com/)).toBeInTheDocument();
    // And the server was asked — not the local page of data.
    expect(fetchSupplierBookings).toHaveBeenCalledWith(
      expect.objectContaining({ search: expect.stringContaining('Kwame') }),
    );
  });

  it('opens their bookings on Enter', async () => {
    renderPalette();
    const user = await openAndType('Kwame');

    await waitFor(() => {
      expect(screen.getByText('Customers')).toBeInTheDocument();
    });
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toContain('/bookings?search=');
    });
    expect(screen.getByTestId('location').textContent).toContain('kwame%40example.com');
  });

  it('opens the conversation from the message action', async () => {
    renderPalette();
    const user = await openAndType('Kwame');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /message kwame mensah/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /message kwame mensah/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/chat?customerId=cust-1');
    });
  });
});

describe('who may see customers', () => {
  it('asks for no customer data without bookings.view', async () => {
    hasPermission.mockImplementation((key) => key !== 'bookings.view');

    renderPalette();
    await openAndType('Kwame');

    // Nothing fetched, nothing rendered — the palette is openable by every
    // role and must not leak people the Bookings page would refuse.
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search pages, products/i)).toHaveValue('Kwame');
    });
    expect(fetchSupplierBookings).not.toHaveBeenCalled();
    expect(screen.queryByText('Customers')).toBeNull();
    expect(screen.queryByText(/kwame@example\.com/)).toBeNull();
  });

  it('does not fetch for a one-letter query', async () => {
    renderPalette();
    await openAndType('K');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search pages, products/i)).toHaveValue('K');
    });
    expect(fetchSupplierBookings).not.toHaveBeenCalled();
  });

  it('says nothing rather than "no results" while the server is still thinking', async () => {
    let resolveSearch;
    fetchSupplierBookings.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    renderPalette();
    await openAndType('Kwame');

    await waitFor(() => {
      expect(fetchSupplierBookings).toHaveBeenCalled();
    });
    expect(screen.queryByText(/no results/i)).toBeNull();

    resolveSearch({ bookings: [], summary: null, pagination: null });
  });
});
