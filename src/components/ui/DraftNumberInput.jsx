import { useState } from 'react'

export default function DraftNumberInput({ value, onCommit, min, className, ...rest }) {
  const [prevValue, setPrevValue] = useState(value)
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)

  if (!focused && value !== prevValue) {
    setPrevValue(value)
    setDraft(value == null ? '' : String(value))
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed === '') {
      onCommit(prevValue == null ? null : prevValue)
      return
    }
    const parsed = Number(trimmed)
    onCommit(Number.isNaN(parsed) ? (prevValue == null ? null : prevValue) : parsed)
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
