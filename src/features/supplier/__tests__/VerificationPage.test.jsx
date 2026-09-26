/**
 * The Verification page is driven by the operator's requirements
 * (`verificationRequirements` from the status payload): the checklist, and
 * whether the Vehicles / Guides sections apply, differ per supplier type.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const doc = (type, label) => ({ type, label, required: true, timing: 'later' });

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
          { type: 'GHANA_CARD', label: 'Ghana Card', required: true, timing: 'upfront' },
          { type: 'BUSINESS_CERTIFICATE', label: 'Business registration certificate', required: true, timing: 'upfront' },
          doc('PASSENGER_TRANSPORT_LICENCE', 'Passenger transport licence'),
          doc('PROFILE_PHOTO', 'Profile photograph'),
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
          { type: 'GHANA_CARD', label: 'Ghana Card', required: true, timing: 'upfront' },
          doc('PROFILE_PHOTO', 'Profile photograph'),
        ],
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
          { type: 'GHANA_CARD', label: 'Ghana Card', required: true, timing: 'upfront' },
          doc('DRIVERS_LICENCE', "Driver's licence"),
        ],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Verification checklist')).toBeInTheDocument());
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Not uploaded')).toBeInTheDocument();
  });
});
