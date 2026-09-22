import { http, HttpResponse } from 'msw';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://apiv1.travioafrica.com/api';

// Mock data
const mockBookings = [
  {
    id: 'BK-2026-0001',
    bookingNumber: 'TGA-78234',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    tourName: 'Serengeti Safari Adventure',
    travelDate: '2026-06-15',
    bookingDate: '2026-05-18',
    travelers: 4,
    total: 2400,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    currency: 'USD',
  },
];

const mockProducts = [
  {
    id: '1',
    title: 'Serengeti Safari Adventure',
    description: 'Experience the wildlife of Serengeti',
    category: 'safari',
    duration: 3,
    durationUnit: 'days',
    pricing: {
      basePrice: 600,
      currency: 'USD',
    },
    status: 'active',
  },
];

// Simulated real user for integration testing
const mockUsers = [
  {
    id: 'firebase-uid-qwabs94',
    name: 'Qwabs User',
    email: 'qwabs94@gmail.com',
    role: 'SUPPLIER',
    status: 'active',
    photoURL: 'https://ui-avatars.com/api/?name=Qwabs+User&background=044b3b&color=fff',
  },
];

// code → category lookup used by the structured-cancellation handlers
// (mirrors Expedition-Go-Backend-v2/src/core/services/cancellationReasons.js).
const REASON_CATEGORIES = {
  GUIDE_UNAVAILABLE: 'OPERATIONAL',
  VEHICLE_BREAKDOWN: 'OPERATIONAL',
  OVERBOOKED: 'OPERATIONAL',
  NOT_ENOUGH_TRAVELERS: 'OPERATIONAL',
  VENUE_CLOSED: 'OPERATIONAL',
  SCHEDULING_CONFLICT: 'OPERATIONAL',
  OPERATIONAL_OTHER: 'OPERATIONAL',
  WEATHER: 'FORCE_MAJEURE',
  NATURAL_DISASTER: 'FORCE_MAJEURE',
  GOVERNMENT_ACTION: 'FORCE_MAJEURE',
  STRIKE: 'FORCE_MAJEURE',
  SAFETY_INCIDENT: 'FORCE_MAJEURE',
  PUBLIC_HEALTH: 'FORCE_MAJEURE',
  FORCE_MAJEURE_OTHER: 'FORCE_MAJEURE',
  CUSTOMER_REQUESTED_CANCEL: 'CUSTOMER_REQUESTED',
};

const REASON_LABELS = {
  GUIDE_UNAVAILABLE: 'Guide or staff unavailable',
  VEHICLE_BREAKDOWN: 'Vehicle or equipment breakdown',
  OVERBOOKED: 'Overbooked / capacity issue',
  NOT_ENOUGH_TRAVELERS: 'Not enough travellers',
  VENUE_CLOSED: 'Venue or facility closed',
  SCHEDULING_CONFLICT: 'Scheduling conflict',
  OPERATIONAL_OTHER: 'Other operational reason',
  WEATHER: 'Adverse weather conditions',
  NATURAL_DISASTER: 'Natural disaster',
  GOVERNMENT_ACTION: 'Government action or travel advisory',
  STRIKE: 'Strike or civil unrest',
  SAFETY_INCIDENT: 'Safety or security incident',
  PUBLIC_HEALTH: 'Public health restriction',
  FORCE_MAJEURE_OTHER: 'Other force majeure event',
  CUSTOMER_REQUESTED_CANCEL: 'Customer asked to cancel this booking',
};

// ── Admin-approval cancellation requests (SUPPLIER_CANCEL_REQUIRES_APPROVAL) ──
// Flag defaults OFF so all existing handlers keep returning executed shapes.
let cancellationApprovalMode = false;

/** Toggle the backend approval flag for tests. Returns the previous value. */
export function setCancellationApprovalMode(enabled) {
  const previous = cancellationApprovalMode;
  cancellationApprovalMode = Boolean(enabled);
  return previous;
}

const mockCancellationRequests = [
  {
    id: 'req-001',
    status: 'PENDING_APPROVAL',
    bookingId: 'BK-2026-0001',
    booking: {
      id: 'BK-2026-0001',
      bookingNumber: 'TGA-78234',
      status: 'CONFIRMED',
      paymentStatus: 'SUCCEEDED',
      currency: 'USD',
      travelDate: '2026-06-15',
      selectedTime: '09:00',
      grossAmount: 2400,
      cancellationCode: 'GUIDE_UNAVAILABLE',
      cancellationCategory: 'OPERATIONAL',
      customer: { id: 'cust-1', name: 'John Smith', email: 'john@example.com' },
    },
    tour: {
      id: 'tour-1',
      title: 'Serengeti Safari Adventure',
      supplier: { id: 'sp-001', name: 'Test Supplier' },
    },
    supplier: 'sp-001',
    payload: {
      cancellationCode: 'GUIDE_UNAVAILABLE',
      cancellationCategory: 'OPERATIONAL',
      explanation: 'Our guide fell ill and no replacement was available.',
      agreedToTerms: true,
    },
    preview: {
      refund: { amount: 2400, note: 'Full refund to the customer' },
      fee: 600,
      countsTowardRate: true,
    },
    stopSellingApplied: false,
    batchId: null,
    decidedBy: null,
    decidedAt: null,
    decisionNote: null,
    reminderCount: 0,
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-20T10:00:00.000Z',
  },
];

function pendingCancellationFor(bookingId) {
  if (!cancellationApprovalMode) return null;
  const request = mockCancellationRequests.find(
    (r) => r.bookingId === bookingId && r.status === 'PENDING_APPROVAL'
  );
  if (!request) return null;
  return {
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    payload: request.payload,
    preview: request.preview,
    stopSellingApplied: request.stopSellingApplied,
  };
}

// Supplier's own tours catalogue (paginated, mirrors GET /tours/supplier/my-tours).
// NOTE: the axios interceptor (src/lib/axios.js) rewrites /tours/supplier/my-tours
// to /travioghana/supplier/tours, so the handler must match the rewritten path.
const mockMyTours = [
  { id: 'tour-1', title: 'Serengeti Safari Adventure', category: 'Safari', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 600 }] }] } }, specialOffers: [{ id: 'so-1', name: 'Safari Week', isActive: true }], specialOfferTargets: [] },
  { id: 'tour-2', title: 'Ngorongoro Crater Day Trip', category: 'Day Trip', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 250 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-3', title: 'Zanzibar Beach Escape', category: 'Beach', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 320 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-4', title: 'Mount Kilimanjaro Trek', category: 'Adventure', status: 'PAUSED', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 1800 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-5', title: 'Tarangire National Park Safari', category: 'Safari', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 420 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-6', title: 'Stone Town Walking Tour', category: 'Cultural', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 90 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-7', title: 'Lake Manyara Canoe Safari', category: 'Adventure', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 210 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-8', title: 'Olduvai Gorge Heritage Tour', category: 'Cultural', status: 'PAUSED', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 150 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-9', title: 'Selous Game Reserve Expedition', category: 'Safari', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 780 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-10', title: 'Ruaha National Park Fly-In', category: 'Safari', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 950 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-11', title: 'Arusha Coffee Farm Experience', category: 'Cultural', status: 'ACTIVE', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 120 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-12', title: 'Mikumi Safari Lodge Weekend', category: 'Safari', status: 'PAUSED', photos: [], coverPhoto: null, schedulesAndPricing: { pricingSchedules: { schedules: [{ prices: [{ retailPrice: 540 }] }] } }, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-13', title: 'Unpublished Draft Product', category: 'Safari', status: 'DRAFT', photos: [], coverPhoto: null, schedulesAndPricing: null, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-14', title: 'Rejected Submission Example', category: 'Safari', status: 'REJECTED', photos: [], coverPhoto: null, schedulesAndPricing: null, specialOffers: [], specialOfferTargets: [] },
  { id: 'tour-15', title: 'Archived Old Product', category: 'Safari', status: 'ARCHIVED', photos: [], coverPhoto: null, schedulesAndPricing: null, specialOffers: [], specialOfferTargets: [] },
];

// API handlers
export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUsers[0],
        token: 'mock-jwt-token',
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  http.post(`${API_BASE_URL}/users/signup`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        { status: "fail", message: "You are not logged in! Please log in to get access." },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      status: "success",
      data: {
        user: { ...mockUsers[0], roles: ["supplier"] },
        supplierProfile: { id: "sp-001", status: "ACTIVE" },
      },
    });
  }),

  // Bookings endpoints
  http.get(`${API_BASE_URL}/bookings/supplier/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let filteredBookings = mockBookings;
    if (status) {
      filteredBookings = mockBookings.filter((b) => b.status === status);
    }

    return HttpResponse.json({
      status: "success",
      data: {
        bookings: filteredBookings.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          selectedDate: b.travelDate,
          createdAt: b.bookingDate,
          travelers: { adults: b.travelers },
          total: b.total,
          status: b.status,
          paymentStatus: b.paymentStatus,
          currency: b.currency,
          customer: { name: b.customerName, email: b.customerEmail },
          tour: { title: b.tourName },
          pendingCancellation: pendingCancellationFor(b.id),
        })),
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: filteredBookings.length,
          limit: 25,
        },
      },
    });
  }),

  http.get(`${API_BASE_URL}/bookings`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let filteredBookings = mockBookings;
    if (status) {
      filteredBookings = mockBookings.filter(b => b.status === status);
    }
    
    return HttpResponse.json({
      data: filteredBookings,
      total: filteredBookings.length,
      page: 1,
      pageSize: 25,
    });
  }),

  // Taxonomy must be registered BEFORE GET /bookings/:id — otherwise the
  // single-segment :id route swallows /bookings/cancellation-reasons.
  http.get(`${API_BASE_URL}/bookings/cancellation-reasons`, () => {
    // Mirrors bookingController.getCancellationReasons (taxonomy owner: backend).
    const reasons = Object.entries(REASON_CATEGORIES).map(([code, category]) => ({
      code,
      category,
      label: REASON_LABELS[code],
    }));
    const byCategory = {
      OPERATIONAL: reasons.filter((r) => r.category === 'OPERATIONAL'),
      FORCE_MAJEURE: reasons.filter((r) => r.category === 'FORCE_MAJEURE'),
      CUSTOMER_REQUESTED: reasons.filter((r) => r.category === 'CUSTOMER_REQUESTED'),
    };
    return HttpResponse.json({
      status: 'success',
      data: {
        categories: ['OPERATIONAL', 'FORCE_MAJEURE', 'CUSTOMER_REQUESTED'],
        reasons,
        byCategory,
        systemCodes: {
          PAYMENT_NOT_COMPLETED: 'Payment not completed',
          ACTIVITY_DATE_PASSED: 'Activity date passed without supplier confirmation',
          PAYMENT_NOT_COLLECTED: 'Payment could not be collected before the activity',
        },
        feePct: 25,
        choiceWindowHours: 48,
      },
    });
  }),

  // Supplier cancellation requests (flag ON). Must be registered before the
  // single-segment /bookings/:id route is irrelevant here (3 segments), but we
  // keep it grouped with the other cancellation handlers for clarity.
  http.get(`${API_BASE_URL}/bookings/supplier/cancellation-requests`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const requests = status
      ? mockCancellationRequests.filter((r) => r.status === status)
      : mockCancellationRequests;
    return HttpResponse.json({
      status: 'success',
      data: {
        requests,
        pendingCount: mockCancellationRequests.filter(
          (r) => r.status === 'PENDING_APPROVAL'
        ).length,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: requests.length,
          limit: 25,
        },
      },
    });
  }),

  http.post(`${API_BASE_URL}/bookings/supplier/cancellation-requests/:id/withdraw`, ({ params }) => {
    const request = mockCancellationRequests.find(
      (r) => r.id === params.id && r.status === 'PENDING_APPROVAL'
    );
    if (!request) {
      // Mirrors the backend: not yours / already decided → 404.
      return HttpResponse.json(
        { status: 'fail', message: 'Cancellation request not found or already decided.' },
        { status: 404 }
      );
    }
    request.status = 'WITHDRAWN';
    request.updatedAt = new Date().toISOString();
    return HttpResponse.json({
      status: 'success',
      data: { request, revertedDates: 0 },
    });
  }),

  http.get(`${API_BASE_URL}/bookings/:id`, ({ params }) => {
    const booking = mockBookings.find(b => b.id === params.id);
    
    if (!booking) {
      return HttpResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(booking);
  }),

  http.patch(`${API_BASE_URL}/bookings/:id/status`, async ({ params, request }) => {
    const body = await request.json();
    const booking = mockBookings.find(b => b.id === params.id);
    
    if (!booking) {
      return HttpResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    const updatedBooking = {
      ...booking,
      status: body.status,
      supplierNotes: body.supplierNotes ?? booking.supplierNotes,
    };

    // Structured supplier cancellation → { booking, cancellation } summary
    // (mirrors bookingController.updateBookingStatus when status === CANCELLED).
    if (body.status === 'CANCELLED') {
      const code = typeof body.cancellationCode === 'string' ? body.cancellationCode.trim() : '';
      if (!code || body.agreedToTerms !== true) {
        return HttpResponse.json(
          { message: 'cancellationCode and agreedToTerms are required to cancel a booking.' },
          { status: 400 }
        );
      }

      const reason = REASON_CATEGORIES[code] ? { code, category: REASON_CATEGORIES[code] } : null;
      const category = reason?.category || null;
      const countsTowardRate = category ? category === 'OPERATIONAL' : true;
      const feeApplies = category ? category === 'OPERATIONAL' : false;
      const gross = Number(updatedBooking.total) || 0;
      const fee = feeApplies ? Math.round(gross * 0.25 * 100) / 100 : 0;

      // Flag ON: park the cancel as an approval request. The booking is
      // returned UNCHANGED (nothing is cancelled yet).
      if (cancellationApprovalMode) {
        const request = {
          id: `req-${Date.now()}`,
          status: 'PENDING_APPROVAL',
          bookingId: booking.id,
          booking: { ...booking },
          tour: {
            id: 'tour-1',
            title: booking.tourName,
            supplier: { id: 'sp-001', name: 'Test Supplier' },
          },
          supplier: 'sp-001',
          payload: {
            cancellationCode: code,
            cancellationCategory: category,
            explanation: body.explanation || '',
            evidenceUrl: body.evidenceUrl,
            customerRefundAgreed: body.customerRefundAgreed,
            agreedToTerms: true,
            supplierNotes: body.supplierNotes,
          },
          preview: {
            refund: { amount: gross, note: 'Full refund to the customer' },
            fee,
            countsTowardRate,
            stopSell: false,
          },
          stopSellingApplied: false,
          batchId: null,
          decidedBy: null,
          decidedAt: null,
          decisionNote: null,
          reminderCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockCancellationRequests.unshift(request);
        return HttpResponse.json({
          status: 'success',
          data: { booking, request },
        });
      }

      return HttpResponse.json({
        status: 'success',
        data: {
          booking: updatedBooking,
          cancellation: {
            refundStatus: 'PENDING',
            refundAmount: gross, // supplier-caused cancels refund the customer in full
            refundExecuted: false,
            fee,
            countsTowardRate,
            choiceDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          },
        },
      });
    }

    return HttpResponse.json({
      status: 'success',
      data: { booking: updatedBooking },
    });
  }),

  http.post(`${API_BASE_URL}/bookings/supplier/cancel-batch`, async ({ request }) => {
    // Flag ON: the batch is parked as approval requests (nothing cancelled).
    if (cancellationApprovalMode) {
      const body = await request.json().catch(() => ({}));
      const requestId = `req-${Date.now()}`;
      return HttpResponse.json({
        status: 'success',
        data: {
          matched: 1,
          overflow: false,
          requested: 1,
          skipped: 0,
          failed: 0,
          stopSellingApplied: Boolean(body.stopAcceptingBookings),
          blockedDates: body.stopAcceptingBookings ? [body.dateFrom] : [],
          batchId: `batch-${Date.now()}`,
          results: [
            {
              bookingId: 'BK-2026-0001',
              bookingNumber: 'TGA-78234',
              ok: true,
              requestId,
            },
          ],
          requests: [],
        },
      });
    }

    // Mirrors cancelBatchBySupplier: `matched` is the processed batch (max 100
    // per run), `overflow` reports how many matched but were not processed.
    return HttpResponse.json({
      status: 'success',
      data: {
        matched: 0,
        cancelled: 0,
        failed: 0,
        totalRefunded: 0,
        totalFees: 0,
        results: [],
        overflow: false,
        blockedDates: [],
      },
    });
  }),

  // Products/Tours endpoints
  http.get(`${API_BASE_URL}/travioghana/supplier/tours`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const MY_TOURS_PAGE_SIZE = 10;
    const start = (page - 1) * MY_TOURS_PAGE_SIZE;
    const tours = mockMyTours.slice(start, start + MY_TOURS_PAGE_SIZE);
    return HttpResponse.json({
      status: 'success',
      data: {
        tours,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(mockMyTours.length / MY_TOURS_PAGE_SIZE),
          totalCount: mockMyTours.length,
          limit: MY_TOURS_PAGE_SIZE,
        },
      },
    });
  }),

  http.get(`${API_BASE_URL}/tours`, () => {
    return HttpResponse.json({
      data: mockProducts,
      total: mockProducts.length,
      page: 1,
      pageSize: 25,
    });
  }),

  http.get(`${API_BASE_URL}/tours/:id`, ({ params }) => {
    const product = mockProducts.find(p => p.id === params.id);
    
    if (!product) {
      return HttpResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(product);
  }),

  http.post(`${API_BASE_URL}/tours`, async ({ request }) => {
    const body = await request.json();
    
    const newProduct = {
      id: String(mockProducts.length + 1),
      ...body,
      status: 'draft',
    };
    
    mockProducts.push(newProduct);
    
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/tours/:id`, async ({ params, request }) => {
    const body = await request.json();
    const productIndex = mockProducts.findIndex(p => p.id === params.id);
    
    if (productIndex === -1) {
      return HttpResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }
    
    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...body,
    };
    
    return HttpResponse.json(mockProducts[productIndex]);
  }),

  http.delete(`${API_BASE_URL}/tours/:id`, ({ params }) => {
    const productIndex = mockProducts.findIndex(p => p.id === params.id);
    
    if (productIndex === -1) {
      return HttpResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }
    
    mockProducts.splice(productIndex, 1);
    
    return HttpResponse.json({ message: 'Product deleted successfully' });
  }),

  // Users endpoints
  http.get(`${API_BASE_URL}/users`, () => {
    return HttpResponse.json({
      data: mockUsers,
      total: mockUsers.length,
      page: 1,
      pageSize: 25,
    });
  }),

  http.get(`${API_BASE_URL}/users/:id`, ({ params }) => {
    const user = mockUsers.find(u => u.id === params.id);
    
    if (!user) {
      return HttpResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(user);
  }),

  // Analytics endpoints
  http.get(`${API_BASE_URL}/admin/analytics/overview`, () => {
    return HttpResponse.json({
      totalRevenue: 125000,
      activeBookings: 45,
      totalProducts: 28,
      newCustomers: 12,
    });
  }),

  http.get(`${API_BASE_URL}/admin/analytics/revenue-trend`, () => {
    return HttpResponse.json({
      data: [
        { month: 'Jan', revenue: 15000 },
        { month: 'Feb', revenue: 18000 },
        { month: 'Mar', revenue: 22000 },
        { month: 'Apr', revenue: 25000 },
        { month: 'May', revenue: 28000 },
      ],
    });
  }),

  // Reviews endpoints
  http.get(`${API_BASE_URL}/reviews/admin/pending`, () => {
    return HttpResponse.json({
      data: [],
      total: 0,
    });
  }),

  // Notifications endpoints
  http.get(`${API_BASE_URL}/notifications`, () => {
    return HttpResponse.json({
      status: "success",
      data: {
        notifications: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          unreadCount: 0,
          limit: 20,
        },
      },
    });
  }),

  http.patch(`${API_BASE_URL}/notifications/mark-all-read`, () => {
    return HttpResponse.json({
      status: "success",
      message: "0 notifications marked as read",
    });
  }),

  http.patch(`${API_BASE_URL}/notifications/:id/read`, () => {
    return HttpResponse.json({
      status: "success",
      message: "Notification marked as read",
    });
  }),

  http.delete(`${API_BASE_URL}/notifications/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Backend Location API (proxy)
  http.get(`${API_BASE_URL}/locations/autocomplete`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    if ('arusha'.includes(q.toLowerCase())) {
      return HttpResponse.json({
        data: {
          results: [
            {
              formatted: 'Arusha, Tanzania',
              city: 'Arusha',
              country: 'Tanzania',
              region: 'Arusha Region',
              latitude: -3.3869,
              longitude: 36.683,
              source: 'geoapify',
            },
          ],
        },
      });
    }

    if ('dodoma'.includes(q.toLowerCase())) {
      return HttpResponse.json({
        data: {
          results: [
            {
              formatted: 'Dodoma, Tanzania',
              city: 'Dodoma',
              country: 'Tanzania',
              region: 'Dodoma Region',
              latitude: -6.1731,
              longitude: 35.742,
              source: 'photon',
            },
          ],
        },
      });
    }

    return HttpResponse.json({ data: { results: [] } });
  }),

  // Geoapify Geocoding (free tier autocomplete)
  http.get('https://api.geoapify.com/v1/geocode/autocomplete', ({ request }) => {
    const url = new URL(request.url);
    const text = url.searchParams.get('text') || '';

    if ('arusha'.includes(text.toLowerCase())) {
      return HttpResponse.json({
        features: [
          {
            type: 'Feature',
            properties: {
              formatted: 'Arusha, Tanzania',
              name: 'Arusha',
              city: 'Arusha',
              country: 'Tanzania',
              state: 'Arusha Region',
            },
            geometry: {
              type: 'Point',
              coordinates: [36.683, -3.3869],
            },
          },
        ],
      });
    }

    return HttpResponse.json({ features: [] });
  }),

  // Nominatim Geocoding (OpenStreetMap fallback)
  http.get('https://nominatim.openstreetmap.org/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    if ('arusha'.includes(q.toLowerCase())) {
      return HttpResponse.json([
        {
          display_name: 'Arusha, Tanzania',
          lat: '-3.3869',
          lon: '36.683',
          address: {
            city: 'Arusha',
            country: 'Tanzania',
            state: 'Arusha Region',
          },
        },
      ]);
    }

    return HttpResponse.json([]);
  }),
];
