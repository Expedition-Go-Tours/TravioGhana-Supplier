import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import Step05Locations from '../steps/Step05Locations'
import { useProductBuilderStore } from '../productBuilderStore'

const CITY_PLACEHOLDER = 'Search for a city or town…'
const NAME_PLACEHOLDER = 'Search for a place or type a name…'

function seed(overrides = {}) {
  useProductBuilderStore.setState({
    duration: 2,
    durationUnit: 'hours',
    stepErrors: {},
    locations: [
      {
        name: 'Cape Coast Castle',
        address: 'Cape Coast Castle, Central Region',
        city: 'Cape Coast',
        region: 'Central',
        description: 'A historic slave-trade castle on the coast.',
        timeSpent: 60,
        timeSpentUnit: 'minutes',
        admissionIncluded: 'yes',
        day: 1,
      },
    ],
    ...overrides,
  })
}

async function openModal(user) {
  renderWithProviders(<Step05Locations />)
  await user.click(screen.getByTitle('Edit details'))
  expect(await screen.findByText('Edit location')).toBeInTheDocument()
}

async function addCustomName(user, name) {
  const nameInput = screen.getByPlaceholderText(NAME_PLACEHOLDER)
  await user.clear(nameInput)
  await user.type(nameInput, name)
  await user.click(await screen.findByRole('button', { name: new RegExp(`Add "${name}"`) }))
}

describe('Step05 location modal — custom name reveals the City picker', () => {
  beforeEach(() => {
    localStorage.clear()
    seed()
  })

  it('keeps the City field hidden for a stop that already has a city', async () => {
    const user = userEvent.setup()
    await openModal(user)

    expect(screen.queryByPlaceholderText(CITY_PLACEHOLDER)).not.toBeInTheDocument()
  })

  it('shows the City field from the start for a stop with no city', async () => {
    seed({
      locations: [
        {
          name: 'Auntie Efua Kitchen Tour',
          address: '',
          city: '',
          region: '',
          description: 'A home-cooking experience.',
          timeSpent: 60,
          timeSpentUnit: 'minutes',
          admissionIncluded: 'yes',
          day: 1,
        },
      ],
    })
    const user = userEvent.setup()
    await openModal(user)

    expect(await screen.findByPlaceholderText(CITY_PLACEHOLDER)).toBeInTheDocument()
  })

  it('reveals City and clears the inherited city/region when a custom name is picked', async () => {
    const user = userEvent.setup()
    await openModal(user)

    await addCustomName(user, 'Auntie Efua Kitchen Tour')

    expect(await screen.findByPlaceholderText(CITY_PLACEHOLDER)).toBeInTheDocument()

    const loc = useProductBuilderStore.getState().locations[0]
    expect(loc.name).toBe('Auntie Efua Kitchen Tour')
    expect(loc.city).toBe('')
    expect(loc.region).toBe('')
  })

  it('collapses the City field again when a catalog name is picked', async () => {
    const user = userEvent.setup()
    await openModal(user)

    await addCustomName(user, 'Auntie Efua Kitchen Tour')
    expect(await screen.findByPlaceholderText(CITY_PLACEHOLDER)).toBeInTheDocument()

    // Clear the custom name and pick a real catalog place instead.
    const nameInput = screen.getByPlaceholderText(NAME_PLACEHOLDER)
    await user.clear(nameInput)
    await user.type(nameInput, 'Kakum')
    await user.click(await screen.findByRole('option', { name: /Kakum/ }))

    await waitFor(() =>
      expect(screen.queryByPlaceholderText(CITY_PLACEHOLDER)).not.toBeInTheDocument(),
    )

    const loc = useProductBuilderStore.getState().locations[0]
    expect(loc.name).toBe('Kakum National Park')
    expect(loc.city).toBe('Cape Coast')
    expect(loc.region).toBe('Central')
  })

  it('blocks Done until the revealed City is filled', async () => {
    const user = userEvent.setup()
    await openModal(user)

    await addCustomName(user, 'Auntie Efua Kitchen Tour')
    await screen.findByPlaceholderText(CITY_PLACEHOLDER)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByText('City is required')).toBeInTheDocument()
    expect(screen.getByText('Edit location')).toBeInTheDocument()
  })

  it('offers cities and towns (not attractions) from the places catalog, then saves the pick', async () => {
    const user = userEvent.setup()
    await openModal(user)

    await addCustomName(user, 'Auntie Efua Kitchen Tour')
    const cityInput = await screen.findByPlaceholderText(CITY_PLACEHOLDER)

    await user.click(cityInput)
    await user.type(cityInput, 'Kumasi')
    const option = await screen.findByRole('option', { name: /Kumasi/ })

    // The city picker is restricted to the cities/towns slice of the catalog.
    expect(screen.queryByRole('option', { name: /Kakum/ })).not.toBeInTheDocument()

    await user.click(option)

    const loc = useProductBuilderStore.getState().locations[0]
    expect(loc.city).toBe('Kumasi')
    expect(loc.region).toBe('Ashanti')

    await user.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByText('Edit location')).not.toBeInTheDocument())
  })
})
