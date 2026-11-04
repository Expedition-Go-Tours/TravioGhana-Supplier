import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import DraftNumberInput from '../DraftNumberInput'

function Harness({ initial = 10, onCommit }) {
  const [value, setValue] = useState(initial)
  return (
    <DraftNumberInput
      aria-label="tier to"
      value={value}
      onCommit={(next) => {
        onCommit?.(next)
        setValue(next == null ? null : next)
      }}
    />
  )
}

describe('DraftNumberInput', () => {
  it('commits what you type on blur', async () => {
    const onCommit = vi.fn()
    render(<Harness initial={1} onCommit={onCommit} />)
    const input = screen.getByRole('spinbutton', { name: 'tier to' })

    await userEvent.clear(input)
    await userEvent.type(input, '4')
    await userEvent.tab()

    expect(onCommit).toHaveBeenCalledWith(4)
    expect(input).toHaveValue(4)
  })

  it('shows the committed value again when the store rejects the edit', async () => {
    // A parent that refuses to shrink: it keeps 10 no matter what is typed.
    render(
      <DraftNumberInput
        aria-label="tier to"
        value={10}
        onCommit={() => {}}
      />,
    )
    const input = screen.getByRole('spinbutton', { name: 'tier to' })

    await userEvent.clear(input)
    await userEvent.type(input, '4')
    await userEvent.tab()

    // The draft must not outlive the edit: a rejected value can never look saved.
    expect(input).toHaveValue(10)
  })

  it('keeps the previous value when the field is cleared', async () => {
    const onCommit = vi.fn()
    render(<Harness initial={7} onCommit={onCommit} />)
    const input = screen.getByRole('spinbutton', { name: 'tier to' })

    await userEvent.clear(input)
    await userEvent.tab()

    expect(onCommit).toHaveBeenCalledWith(7)
    expect(input).toHaveValue(7)
  })
})
