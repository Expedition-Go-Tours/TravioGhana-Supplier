import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Step14PricingAvailability from '../steps/Step14PricingAvailability'
import { useProductBuilderStore } from '../productBuilderStore'

const EMPTY_WEEK = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] }

function seed(overrides = {}) {
  useProductBuilderStore.setState({
    options: [{ id: 'opt1', title: 'Walking tour' }],
    selectedOptionId: 'opt1',
    stepErrors: {},
    scheduleType: 'operatingHours',
    pricingModel: 'perPerson',
    schedules: [],
    weeklySchedule: { ...EMPTY_WEEK },
    dateExceptions: [],
    timeSlots: [],
    groupSizes: [],
    uniformPrice: null,
    pricingCategories: [
      {
        name: 'Adult', price: null, minAge: 18, maxAge: 59, notAllowed: false,
        ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [],
      },
    ],
    minParticipants: 1,
    maxParticipants: 10,
    maxGroupsPerTimeSlot: 1,
    additionalPersonsEnabled: false,
    additionalPersonPrice: null,
    ...overrides,
  })
}

function renderStep() {
  render(<Step14PricingAvailability />)
}

describe('Step14PricingAvailability schedule type switch', () => {
  beforeEach(() => {
    localStorage.clear()
    seed()
  })

  it('shows the GYG-style no-mixing notes', () => {
    renderStep()
    expect(screen.getByText('Select how you run your activity')).toBeInTheDocument()
    expect(screen.getByText('Select how you price your activity')).toBeInTheDocument()
    expect(screen.getByText('You cannot mix fixed time slots with operating hours in the same option.')).toBeInTheDocument()
    expect(screen.getByText("You can't select both price per group and price per person in the same option.")).toBeInTheDocument()
  })

  it('switches silently when there is nothing to lose', async () => {
    const user = userEvent.setup()
    renderStep()
    await user.click(screen.getByText('Fixed time slot'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useProductBuilderStore.getState().scheduleType).toBe('fixedTimeSlot')
  })

  it('prompts before deleting opening hours + prices, and Cancel keeps everything', async () => {
    seed({
      weeklySchedule: { ...EMPTY_WEEK, Monday: [{ startTime: '09:00', endTime: '17:00' }] },
      pricingCategories: [{ name: 'Adult', price: 100, minAge: 18, maxAge: 59, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
    })
    const user = userEvent.setup()
    renderStep()
    await user.click(screen.getByText('Fixed time slot'))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Change availability type')
    expect(dialog).toHaveTextContent('operating hours, pricing categories and price settings')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const s = useProductBuilderStore.getState()
    expect(s.scheduleType).toBe('operatingHours')
    expect(s.weeklySchedule.Monday).toHaveLength(1)
    expect(s.pricingCategories[0].price).toBe(100)
  })

  it('confirms and wipes opening hours, pricing and capacity', async () => {
    seed({
      weeklySchedule: { ...EMPTY_WEEK, Monday: [{ startTime: '09:00', endTime: '17:00' }] },
      pricingCategories: [{ name: 'Adult', price: 100, minAge: 18, maxAge: 59, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
    })
    const user = userEvent.setup()
    renderStep()
    await user.click(screen.getByText('Fixed time slot'))
    await user.click(screen.getByRole('button', { name: 'Change availability type' }))

    const s = useProductBuilderStore.getState()
    expect(s.scheduleType).toBe('fixedTimeSlot')
    expect(s.weeklySchedule).toEqual(EMPTY_WEEK)
    expect(s.pricingCategories[0].price).toBeNull()
    expect(s.minParticipants).toBe(1)
    expect(s.isDirty).toBe(true)
  })

  it('prompts before switching back to operating hours and clears time slots', async () => {
    seed({
      scheduleType: 'fixedTimeSlot',
      timeSlots: [{ id: 's1', startTime: '09:00' }],
      weeklySchedule: { ...EMPTY_WEEK, Saturday: [{ startTime: '10:00', endTime: '18:00' }] },
    })
    const user = userEvent.setup()
    renderStep()
    await user.click(screen.getByText('Operating hours'))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('time slots, pricing categories and price settings')

    await user.click(screen.getByRole('button', { name: 'Change availability type' }))
    const s = useProductBuilderStore.getState()
    expect(s.scheduleType).toBe('operatingHours')
    expect(s.timeSlots).toEqual([])
    expect(s.weeklySchedule.Saturday).toHaveLength(1)
  })
})

describe('Step14PricingAvailability pricing model switch', () => {
  beforeEach(() => {
    localStorage.clear()
    seed()
  })

  it('prompts when pricing data exists and Cancel keeps the model', async () => {
    seed({
      pricingCategories: [{ name: 'Adult', price: 100, minAge: 18, maxAge: 59, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
    })
    const user = userEvent.setup()
    renderStep()
    await user.click(screen.getByText('Price per group/vehicle'))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Change pricing model')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useProductBuilderStore.getState().pricingModel).toBe('perPerson')
  })

  it('confirms the switch and wipes pricing buffers', async () => {
    seed({
      weeklySchedule: { ...EMPTY_WEEK, Monday: [{ startTime: '09:00', endTime: '17:00' }] },
      pricingCategories: [{ name: 'Adult', price: 100, minAge: 18, maxAge: 59, notAllowed: false, ticketNotRequired: false, needsAdult: false, idRequired: false, idType: '', tiers: [] }],
    })
    const user = userEvent.setup()
    renderStep()
    await user.click(screen.getByText('Price per group/vehicle'))
    await user.click(screen.getByRole('button', { name: 'Change pricing model' }))

    const s = useProductBuilderStore.getState()
    expect(s.pricingModel).toBe('perGroup')
    expect(s.pricingCategories[0].price).toBeNull()
    expect(s.weeklySchedule.Monday).toHaveLength(1)
  })
})