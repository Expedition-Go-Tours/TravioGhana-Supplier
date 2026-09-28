/**
 * The Verification page is driven by the operator's requirements
 * (`verificationRequirements` from the status payload): the checklist — split
 * into the enforced "provided during registration" set and the advisory "still
 * to provide" set — and whether the Vehicles / Guides sections apply differ per
 * supplier type.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const loadSupplierVerification = vi.fn();

vi.mock('@/features/auth/api', () => ({
  loadSupplierVerification: (...args) => loadSupplierVerification(...args),
}));

vi.mock('@/features/supplier/api', () => ({
  replaceDocument: vi.fn(),
  addDocument: vi.fn(),
  addVehicle: vi.fn(),
  removeVehicle: vi.fn(),
  addGuide: vi.fn(),
  removeGuide: vi.fn(),
}));

import { addDocument } from '@/features/supplier/api';
import VerificationPage from '../pages/VerificationPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VerificationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const doc = (type, label, detail, overrides = {}) => ({
  type,
  label,
  detail: detail || 'Anything else we should have on file.',
  required: true,
  timing: 'later',
  ...overrides,
});

// The exact detail sentences the backend engine emits — asserted here so the
// wording shown on the dashboard stays glued to the server's, not the page's.
const GHANA_CARD_DETAIL =
  'Upload one Ghana Card, passport or another accepted government-issued ID. Your details should match the information on your profile.';
const BUSINESS_CERT_DETAIL =
  'Upload your business registration certificate so we can confirm the business behind this supplier account.';
const PTL_DETAIL =
  'Required before transport services or vehicle-based tours become bookable.';

describe('VerificationPage — dynamic by operator type', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives a transport company a transport checklist plus vehicles and guides', async () => {
    loadSupplierVerification.mockResolvedValue({
      profile: { supplierType: 'TRANSPORTATION_PROVIDER', documents: [], vehicles: [], guides: [] },
      requirements: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        vehicles: 'required',
        guides: 'optional',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          { type: 'BUSINESS_CERTIFICATE', label: 'Business registration certificate', detail: BUSINESS_CERT_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('PASSENGER_TRANSPORT_LICENCE', 'Passenger transport licence', PTL_DETAIL),
          doc('PROFILE_PHOTO', 'Profile photograph'),
        ],
        vehicleDocuments: [
          { type: 'VEHICLE_REGISTRATION', label: 'Vehicle registration', detail: 'Required for the vehicle used to fulfil bookings.', required: true, timing: 'per_vehicle', ownerType: 'VEHICLE' },
        ],
        guideDocuments: [
          { type: 'TOUR_GUIDE_LICENCE', label: 'Tour guide licence', detail: 'Required before you can lead bookable tours on TravioGhana.', required: true, timing: 'per_guide', ownerType: 'GUIDE' },
        ],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Verification checklist')).toBeInTheDocument());
    expect(screen.getByText('Passenger transport licence')).toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
    expect(screen.getByText(/Required for your operator type/)).toBeInTheDocument();
  });

  it('keeps an experience host to documents only — no vehicles or guides', async () => {
    loadSupplierVerification.mockResolvedValue({
      profile: { supplierType: 'OTHER_SERVICE_PROVIDER', documents: [], vehicles: [], guides: [] },
      requirements: {
        supplierType: 'OTHER_SERVICE_PROVIDER',
        vehicles: 'hidden',
        guides: 'hidden',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('PROFILE_PHOTO', 'Profile photograph'),
        ],
        vehicleDocuments: [],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Verification checklist')).toBeInTheDocument());
    expect(screen.queryByText('Vehicles')).toBeNull();
    expect(screen.queryByText('Guides')).toBeNull();
  });

  it('marks each checklist item with its upload status', async () => {
    loadSupplierVerification.mockResolvedValue({
      profile: {
        supplierType: 'VEHICLE_OPERATOR',
        documents: [
          { id: 'd1', type: 'GHANA_CARD', ownerType: 'SUPPLIER', status: 'APPROVED', url: 'https://x/y.png' },
        ],
        vehicles: [],
        guides: [],
      },
      requirements: {
        supplierType: 'VEHICLE_OPERATOR',
        vehicles: 'required',
        guides: 'hidden',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('DRIVERS_LICENCE', "Driver's licence", PTL_DETAIL),
        ],
        vehicleDocuments: [],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Verification checklist')).toBeInTheDocument());
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Not uploaded')).toBeInTheDocument();
  });

  it('splits the checklist into provided-at-registration and still-to-provide, with server wording', async () => {
    loadSupplierVerification.mockResolvedValue({
      profile: { supplierType: 'TRANSPORTATION_PROVIDER', documents: [], vehicles: [], guides: [] },
      requirements: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        vehicles: 'required',
        guides: 'optional',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          { type: 'BUSINESS_CERTIFICATE', label: 'Business registration certificate', detail: BUSINESS_CERT_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('PASSENGER_TRANSPORT_LICENCE', 'Passenger transport licence', PTL_DETAIL),
          doc('PROFILE_PHOTO', 'Profile photograph'),
        ],
        vehicleDocuments: [],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Provided during registration')).toBeInTheDocument());
    // Enforced up-front rows carry a Required badge; later rows carry the
    // documentation-window badge (the same grace days the wizard promises).
    expect(screen.getAllByText('Required')).toHaveLength(2);
    expect(screen.getAllByText('Within 30 days')).toHaveLength(2);
    expect(screen.getByText(/Upload one Ghana Card, passport or another accepted government-issued ID/)).toBeInTheDocument();
    expect(screen.getByText(/transport services or vehicle-based tours/)).toBeInTheDocument();
  });

  it('derives the additional-documents picker from the server requirement list', async () => {
    loadSupplierVerification.mockResolvedValue({
      profile: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        documents: [
          { id: 'd1', type: 'GHANA_CARD', ownerType: 'SUPPLIER', status: 'APPROVED' },
        ],
        vehicles: [],
        guides: [],
      },
      requirements: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        vehicles: 'required',
        guides: 'optional',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          { type: 'BUSINESS_CERTIFICATE', label: 'Business registration certificate', detail: BUSINESS_CERT_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('PASSENGER_TRANSPORT_LICENCE', 'Passenger transport licence', PTL_DETAIL),
          doc('PROFILE_PHOTO', 'Profile photograph'),
        ],
        vehicleDocuments: [],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Verification checklist')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add document' }));

    // Server labels flow into the picker…
    expect(screen.getByRole('option', { name: 'Passenger transport licence' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Business registration certificate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other document' })).toBeInTheDocument();
    // …but a type already on file at supplier level is not offered (the backend
    // rejects a duplicate pending/approved document of the same type).
    expect(screen.queryByRole('option', { name: 'Ghana Card' })).toBeNull();
  });

  it('attaches a missing document to an existing vehicle via the repair path', async () => {
    loadSupplierVerification.mockResolvedValue({
      profile: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        documents: [],
        vehicles: [
          { id: 'v1', make: 'Toyota', model: 'Hiace', year: 2021, registrationNumber: 'GW-1234-21', status: 'VERIFIED' },
        ],
        guides: [],
      },
      requirements: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        vehicles: 'required',
        guides: 'optional',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('PASSENGER_TRANSPORT_LICENCE', 'Passenger transport licence', PTL_DETAIL),
        ],
        vehicleDocuments: [
          { type: 'VEHICLE_REGISTRATION', label: 'Vehicle registration', detail: 'Required for the vehicle used to fulfil bookings.', required: true, timing: 'per_vehicle', ownerType: 'VEHICLE' },
          { type: 'VEHICLE_INSURANCE', label: 'Vehicle insurance', detail: 'Required before the vehicle becomes active on TravioGhana.', required: true, timing: 'per_vehicle', ownerType: 'VEHICLE' },
        ],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Vehicle registration')).toBeInTheDocument());
    expect(screen.getAllByText('Not uploaded')).toHaveLength(4); // PTL + 2 vehicle docs + Ghana Card

    const file = new File(['pdf-bytes'], 'registration.pdf', { type: 'application/pdf' });
    const input = screen.getByText('Vehicle registration').closest('div').querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(addDocument).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'VEHICLE_REGISTRATION', ownerType: 'VEHICLE', ownerId: 'v1' })
      )
    );
  });

  it('shows the 30-day documentation window with days remaining', async () => {
    const deadline = new Date(Date.now() + 10 * 86_400_000).toISOString();
    loadSupplierVerification.mockResolvedValue({
      profile: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        documents: [
          { id: 'd1', type: 'GHANA_CARD', ownerType: 'SUPPLIER', status: 'APPROVED' },
        ],
        vehicles: [],
        guides: [],
      },
      requirements: {
        supplierType: 'TRANSPORTATION_PROVIDER',
        documentationGraceDays: 30,
        documentationDeadline: deadline,
        vehicles: 'required',
        guides: 'optional',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('PASSENGER_TRANSPORT_LICENCE', 'Passenger transport licence', PTL_DETAIL),
        ],
        vehicleDocuments: [],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/The documents below are due/)).toBeInTheDocument());
    expect(screen.getByText(/10 days left/)).toBeInTheDocument();
    expect(screen.getByText(/Only your ID \(and business certificate/)).toBeInTheDocument();
  });

  it('flags an overdue documentation window', async () => {
    const deadline = new Date(Date.now() - 5 * 86_400_000).toISOString();
    loadSupplierVerification.mockResolvedValue({
      profile: { supplierType: 'VEHICLE_OPERATOR', documents: [], vehicles: [], guides: [] },
      requirements: {
        supplierType: 'VEHICLE_OPERATOR',
        documentationGraceDays: 30,
        documentationDeadline: deadline,
        vehicles: 'required',
        guides: 'hidden',
        documents: [
          { type: 'GHANA_CARD', label: 'Ghana Card', detail: GHANA_CARD_DETAIL, required: true, timing: 'upfront', enforced: true },
          doc('DRIVERS_LICENCE', "Driver's licence", PTL_DETAIL),
        ],
        vehicleDocuments: [],
        guideDocuments: [],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/5 days overdue/)).toBeInTheDocument());
  });
});