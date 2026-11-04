import { useState } from 'react'

/**
 * Number input that keeps what you type in a draft while you are editing and
 * commits on blur/Enter.
 *
 * While it is not focused it mirrors the committed `value` exactly, so a value
 * the store rejected can never linger on screen as if it had saved — that
 * mismatch is what made a shortened tier look saved while the old number was
 * still driving "Add tier".
 */
export default function DraftNumberInput({ value, onCommit, min, className, ...rest }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)

  if (!focused) {
    const committed = value == null ? '' : String(value)
    if (committed !== draft) setDraft(committed)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed === '') {
      onCommit(value == null ? null : value)
      return
    }
    const parsed = Number(trimmed)
    onCommit(Number.isNaN(parsed) ? (value == null ? null : value) : parsed)
  }

  return (
    <input
      type="number"
      min={min}
      value={draft}
      onFocus={(e) => {
        setFocused(true)
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onChange={(e) => setDraft(e.target.value)}
      className={className}
      {...rest}
    />
  )
}
