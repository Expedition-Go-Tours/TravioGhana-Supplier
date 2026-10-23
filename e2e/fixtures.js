import { expect } from '@playwright/test';

/**
 * Shared browser harness.
 *
 * Every request under `/api/` is fulfilled in-browser, so the suite never
 * touches a real backend and never needs production credentials. Auth is
 * seeded exactly the way the app reads it (localStorage), which also makes the
 * protected-route guard part of what these tests exercise.
 */

export const SUPPLIER_USER = {
  id: 'e2e-supplier-user',
  name: 'Ama Serwaa',
  email: 'ama@example.com',
  roles: ['supplier'],
  photoURL: '',
};

export const SUPPLIER_PROFILE = {
  id: 'e2e-supplier',
  status: 'ACTIVE',
  businessName: 'Accra Cultural Tours',
};

export const BOOKINGS = [
  {
    id: 'e2e-booking-1',
    bookingNumber: 'TRG-10000001-2026-01',
    createdAt: '2026-10-18T09:00:00.000Z',
    travelDate: '2026-11-04T00:00:00.000Z',
    status: 'CONFIRMED',
    paymentStatus: 'SUCCEEDED',
    grossAmount: 420,
    subtotal: 420,
    currency: 'USD',
    source: 'GHANA',
    customer: { id: 'cust-1', name: 'Kwame Mensah', email: 'c-1111111111aaaaaa@messages.travioghana.com', phone: '+233201111111' },
    tour: { id: 'tour-1', title: 'Shai Hills Safari', coverPhoto: '', bookingAndTickets: { instantConfirmation: true } },
    travelers: { adults: 2, children: 0, infants: 0 },
  },
  {
    id: 'e2e-booking-2',
    bookingNumber: 'TRG-10000002-2026-01',
    createdAt: '2026-10-17T09:00:00.000Z',
    travelDate: '2026-11-05T00:00:00.000Z',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    grossAmount: 180,
    subtotal: 180,
    currency: 'USD',
    source: 'GHANA',
    customer: { id: 'cust-2', name: 'Akosua Boateng', email: 'c-2222222222bbbbbb@messages.travioghana.com', phone: '+233202222222' },
    tour: { id: 'tour-1', title: 'Shai Hills Safari', coverPhoto: '', bookingAndTickets: { instantConfirmation: false } },
    travelers: { adults: 1, children: 0, infants: 0 },
  },
  {
    id: 'e2e-booking-3',
    bookingNumber: 'TRG-10000003-2026-01',
    createdAt: '2026-10-16T09:00:00.000Z',
    travelDate: '2026-10-01T00:00:00.000Z',
    status: 'COMPLETED',
    paymentStatus: 'SUCCEEDED',
    grossAmount: 300,
    subtotal: 300,
    currency: 'USD',
    source: 'GHANA',
    customer: { id: 'cust-3', name: 'Yaw Owusu', email: 'c-3333333333cccccc@messages.travioghana.com', phone: '+233203333333' },
    tour: { id: 'tour-1', title: 'Shai Hills Safari', coverPhoto: '', bookingAndTickets: { instantConfirmation: true } },
    travelers: { adults: 3, children: 0, infants: 0 },
  },
];

/** Seed the exact localStorage keys the app hydrates its session from. */
export async function signIn(page) {
  await page.addInitScript(
    ({ user, profile }) => {
      localStorage.setItem('auth_token', 'e2e-access-token');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { user, supplierProfile: profile }, version: 0 }),
      );
    },
    { user: SUPPLIER_USER, profile: SUPPLIER_PROFILE },
  );
}

export async function signOut(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth-storage');
  });
}

function json(data, status = 200) {
  return {
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    },
    body: JSON.stringify(data),
  };
}

function pathOf(url) {
  // Keep the brand prefix so handlers can match the rewritten supplier paths.
  const pathname = new URL(url).pathname;
  const apiIndex = pathname.indexOf('/api/');
  return apiIndex >= 0 ? pathname.slice(apiIndex + 4) : pathname;
}

function bookingPage(url) {
  const params = new URL(url).searchParams;
  const limit = Number(params.get('limit')) || 10;
  const page = Number(params.get('page')) || 1;
  const status = params.get('status');
  const search = (params.get('search') || '').toLowerCase();
  const filtered = BOOKINGS.filter((booking) => {
    if (status && booking.status !== status) return false;
    if (!search) return true;
    return [booking.bookingNumber, booking.customer.name, booking.customer.email, booking.tour.title]
      .some((value) => String(value).toLowerCase().includes(search));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  return {
    status: 'success',
    data: {
      bookings: filtered.slice((page - 1) * limit, page * limit),
      summary: {
        totalRevenue: filtered.reduce((sum, booking) => sum + booking.grossAmount, 0),
        totalBookings: filtered.length,
        counts: filtered.reduce((counts, booking) => {
          counts[booking.status] = (counts[booking.status] || 0) + 1;
          return counts;
        }, {}),
      },
      pagination: { currentPage: page, totalPages, totalCount: filtered.length, limit },
    },
  };
}

/**
 * Install the default API contract. Individual specs can add a handler with a
 * more specific route before calling this — Playwright runs routes in reverse
 * registration order, so the later handler wins.
 */
export async function installApiMocks(page, overrides = {}) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      // Surfaced in the HTML report when a test fails; never thrown, because
      // third-party widgets log noise the app cannot control.
      console.info(`[browser:error] ${message.text()}`);
    }
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const path = pathOf(request.url());

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      } });
    }

    for (const [fragment, handler] of Object.entries(overrides)) {
      if (path.includes(fragment)) {
        // An override owns the request unless it returns `false`, which hands
        // it back to the defaults below.
        const result = await handler({ route, request, path });
        if (result !== false) return;
      }
    }

    if (path.includes('/travioghana/supplier/bookings')) {
      // `/travioghana/supplier/bookings/:id` is the detail panel's endpoint;
      // the bare path is the list.
      const tail = path.split('/travioghana/supplier/bookings')[1] || '';
      const id = tail.replace(/^\//, '').split('/')[0];
      if (id) {
        const booking = BOOKINGS.find((entry) => entry.id === id);
        if (!booking) {
          return route.fulfill(json({ status: 'fail', message: 'Booking not found' }, 404));
        }
        return route.fulfill(
          json({ status: 'success', data: { booking: { ...booking, review: null } } }),
        );
      }
      return route.fulfill(json(bookingPage(request.url())));
    }

    if (path.includes('/travioghana/supplier/notifications')) {
      return route.fulfill(json({ status: 'success', data: { notifications: [], unreadCount: 0 } }));
    }

    if (path.includes('/notifications')) {
      return route.fulfill(json({ status: 'success', data: { notifications: [], unreadCount: 0 } }));
    }

    if (path.includes('/chat/conversations/unread-count')) {
      return route.fulfill(json({ status: 'success', data: { unreadCount: 0 } }));
    }

    if (path.includes('/chat/conversations')) {
      return route.fulfill(json({ status: 'success', data: { conversations: [] } }));
    }

    if (path.includes('/settings/team/my-role')) {
      return route.fulfill(json({
        status: 'success',
        data: { role: 'OWNER', roles: ['OWNER'], permissions: ['*'], isOwner: true, storefronts: ['GHANA'] },
      }));
    }

    if (path.includes('/suppliers/application/status')) {
      return route.fulfill(json({ status: 'success', data: { supplierProfile: SUPPLIER_PROFILE } }));
    }

    if (path.includes('/users/me')) {
      return route.fulfill(json({ status: 'success', data: { user: SUPPLIER_USER } }));
    }

    // A benign empty envelope for every other read. Writes default to 200 too:
    // a test that needs to observe a write installs an override.
    if (method === 'GET') {
      return route.fulfill(json({ status: 'success', data: {} }));
    }
    return route.fulfill(json({ status: 'success', data: {} }));
  });
}

/** Skip the 1.5s success pause on the auth callback. */
export async function gotoApp(page, path) {
  await page.goto(path);
  await expect(page.locator('body')).toBeVisible();
}
