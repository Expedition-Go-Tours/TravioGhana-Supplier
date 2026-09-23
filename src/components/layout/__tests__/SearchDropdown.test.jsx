import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { renderWithProviders } from '@/test/utils'
import SearchDropdown from '@/components/layout/SearchDropdown'

vi.mock('@/hooks/useTeamRole', () => ({
  useTeamRole: () => ({ hasPermission: () => true }),
}))

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://apiv1.travioafrica.com/api'

const AKOSOMBO_TOUR = {
  id: 'tour-akosombo',
  title: 'Akosombo: African spirituality shrine experience',
  category: 'tour',
  status: 'ACTIVE',
  city: 'Accra',
  country: 'Ghana',
  description: 'A shrine and bead-making experience.',
  photos: [],
  coverPhoto: null,
  productContent: {
    locations: [
      { name: 'Cedi bead Factory Akosombo', city: 'Accra', region: 'Greater Accra' },
      { name: 'dkdkdk', city: 'Koforidua' },
      { name: 'Akosombo Shrine', city: 'Koforidua' },
    ],
  },
}

function mockSupplierTours(tours) {
  server.use(
    http.get(`${API_BASE_URL}/travioghana/supplier/tours`, () =>
      HttpResponse.json({
        status: 'success',
        data: {
          tours,
          pagination: { currentPage: 1, totalPages: 1, totalCount: tours.length, limit: 200 },
        },
      }),
    ),
  )
}

async function openAndType(user, text) {
  renderWithProviders(<SearchDropdown />)
  await user.click(screen.getByRole('button', { name: 'Search pages and products' }))
  const input = screen.getByPlaceholderText('Search pages, products…')
  await user.type(input, text)
  return input
}

describe('SearchDropdown tour search', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth_token', 'test-token')
    mockSupplierTours([AKOSOMBO_TOUR])
  })

  it('finds a product by an itinerary stop name', async () => {
    const user = userEvent.setup()
    await openAndType(user, 'Cedi bead Factory Akosombo')

    expect(
      await screen.findByText('Akosombo: African spirituality shrine experience'),
    ).toBeInTheDocument()
  })

  it('finds a product by an itinerary stop city', async () => {
    const user = userEvent.setup()
    await openAndType(user, 'Koforidua')

    expect(
      await screen.findByText('Akosombo: African spirituality shrine experience'),
    ).toBeInTheDocument()
  })

  it('still shows no results for an unrelated term', async () => {
    const user = userEvent.setup()
    await openAndType(user, 'zzz-not-a-place')

    await waitFor(() =>
      expect(screen.getByText(/No results for "zzz-not-a-place"/)).toBeInTheDocument(),
    )
  })
})
