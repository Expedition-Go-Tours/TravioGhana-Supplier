/**
 * The review step is the last thing a supplier sees before submitting, so two
 * failures are expensive: a description that swallows the page, and a
 * completeness count that disagrees with the fix links.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const state = vi.hoisted(() => ({
  title: 'Cape Coast Castle, Elmina Castle & Kakum National Park Tour',
  shortDescription: 'A full-day trip from Accra to the Cape Coast castles and the Kakum canopy walkway.',
  fullDescription: 'Short enough to read.',
  highlights: ['Explore Kakum', 'Discover Elmina Castle', 'Walk the canopy walkway'],
  keywords: ['cape coast', 'kakum'],
  photos: [{ url: 'https://example.com/1.jpg' }, { url: 'https://example.com/2.jpg' }],
  coverPhoto: 'https://example.com/1.jpg',
  copyrightConfirmed: false,
  category: 'tour',
  duration: 11,
  durationUnit: 'hours',
  difficulty: 'easy',
  language: 'en',
  locations: [{ id: 'a', name: 'Kakum National Park', city: 'Cape Coast', country: 'Ghana', description: 'Canopy walk' }],
  whatsIncluded: ['Water', 'Guide', 'Transport'],
  whatsNotIncluded: ['Lunch', 'Hotel', 'Insurance'],
  foodProvided: false,
  meals: [],
  drinksIncluded: false,
  guideType: 'tour-guide',
  guideMaterials: { audioGuide: false, infoBooklet: false },
  meetingMode: 'pickup',
  meetingPoint: null,
  meetingPoints: [],
  meetingPointDescription: '',
  pickupType: 'area',
  pickupAreas: [{ name: 'Accra' }],
  pickupLocations: [],
  cancellationType: 'standard',
  supplierCanCancelBadWeather: false,
  supplierCanCancelNotEnoughTravelers: false,
  cutoffMinutes: 24,
  instantConfirmation: true,
  lastMinuteBookings: false,
  options: [{ id: 'o1', title: 'Shared group', description: 'Join other travellers.' }],
  pricingApproach: 'sameForEveryone',
  pricingModel: 'perPerson',
  uniformPrice: 150,
  pricingCategories: [],
  minParticipants: 1,
  maxParticipants: 12,
  currency: 'USD',
  emergencyPhone: '+233201234567',
  wifiIncluded: false,
  wifiIncludedAnswered: true,
  notSuitableFor: [],
  notAllowed: [],
  mandatoryItems: [],
  knowBeforeYouGo: '',
  petFriendly: false,
  wheelchairAccessible: false,
  passportRequired: false,
  accommodationIncluded: false,
  dayLogistics: {},
  navigateTo: vi.fn(),
}))

vi.mock('@/features/products/productBuilderStore', () => ({
  useProductBuilderStore: Object.assign(
    (selector) => (selector ? selector(state) : state),
    { getState: () => state, setState: () => {} },
  ),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, formatCurrency: (value, currency) => `${currency} ${Number(value).toFixed(2)}` }
})

import Step17ProductPreview from '../Step17ProductPreview'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('long descriptions', () => {
  it('clamps a long description and expands it on request', async () => {
    const user = userEvent.setup()
    state.fullDescription = `Intro. ${'The walkway crosses the rainforest canopy. '.repeat(40)}`

    render(<Step17ProductPreview />)

    const paragraph = screen.getByText(/Intro\./)
    expect(paragraph.className).toContain('line-clamp-6')
    expect(paragraph.className).toContain('[overflow-wrap:anywhere]')

    await user.click(screen.getByRole('button', { name: /show full description/i }))

    expect(screen.getByText(/Intro\./).className).not.toContain('line-clamp-6')
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
  })

  it('leaves a short description unclamped', () => {
    state.fullDescription = 'A short description.'
    render(<Step17ProductPreview />)

    expect(screen.getByText('A short description.').className).not.toContain('line-clamp-6')
    expect(screen.queryByRole('button', { name: /show full description/i })).not.toBeInTheDocument()
  })

  it('wraps a pasted URL instead of widening the card', () => {
    state.fullDescription = `https://example.com/${'a'.repeat(600)}`
    render(<Step17ProductPreview />)

    expect(screen.getByText(/^https:\/\/example\.com/).className).toContain('[overflow-wrap:anywhere]')
  })
})

describe('completeness', () => {
  it('counts ready sections and links the ones that are not', () => {
    render(<Step17ProductPreview />)

    // Photos need five and the copyright confirmation; both are missing here.
    expect(screen.getByText(/sections ready/)).toHaveTextContent('10 of 11 sections ready')
    expect(screen.getByRole('button', { name: /fix photos/i })).toBeInTheDocument()
  })

  it('says nothing needs fixing when every section is ready', () => {
    state.photos = Array.from({ length: 5 }, (_, i) => ({ url: `https://example.com/${i}.jpg` }))
    state.copyrightConfirmed = true

    render(<Step17ProductPreview />)

    expect(screen.getByText(/sections ready/)).toHaveTextContent('11 of 11 sections ready')
    expect(screen.queryByRole('button', { name: /^fix /i })).not.toBeInTheDocument()
  })

  it('marks a missing emergency phone as required in the section itself', () => {
    state.emergencyPhone = ''
    render(<Step17ProductPreview />)

    expect(screen.getByText(/Missing — required/)).toBeInTheDocument()
  })
})
