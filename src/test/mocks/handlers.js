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

// Supplier's own tours catalogue (paginated, mirrors GET /tours/supplier/my-tours)
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
    
    return HttpResponse.json({
      ...booking,
      status: body.status,
    });
  }),

  // Products/Tours endpoints
  http.get(`${API_BASE_URL}/tours/supplier/my-tours`, ({ request }) => {
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
