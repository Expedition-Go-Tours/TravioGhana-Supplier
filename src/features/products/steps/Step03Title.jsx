import { useState, useRef, useEffect } from 'react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { TITLE_MAX_CHARS, REFERENCE_CODE_MAX_CHARS, limitMessage } from '@/features/products/productFormSchema'
import { syncExternalReviews } from '@/features/products/api'

/* ── Platform config ── */
const PLATFORMS = [
  {
    key: 'google',
    label: 'Google Business / Maps',
    placeholder: 'https://business.google.com/...',
    pattern: /google\.com\/maps|goo\.gl\/maps|business\.google|google\.com\/business/i,
    color: 'bg-green-50 border-green-200 text-green-800',
    dotColor: 'bg-green-500',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    key: 'viator',
    label: 'TripAdvisor / Viator',
    placeholder: 'https://www.viator.com/...',
    pattern: /viator\.com|tripadvisor\.com/i,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    dotColor: 'bg-blue-500',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#003580"/>
        <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="Arial,sans-serif">V</text>
      </svg>
    ),
  },
  {
    key: 'getyourguide',
    label: 'GetYourGuide',
    placeholder: 'https://www.getyourguide.com/...',
    pattern: /getyourguide\.com/i,
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    dotColor: 'bg-amber-500',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#E8531E"/>
        <path d="M12 6l3.5 5H8.5L12 6z" fill="#fff"/>
        <circle cx="12" cy="14.5" r="2" fill="#fff"/>
      </svg>
    ),
  },
]

function getPlatform(key) {
  return PLATFORMS.find((p) => p.key === key)
}

function validateUrl(url, platformKey) {
  if (!url || !url.trim()) return 'URL is required'
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'URL must start with http:// or https://'
  } catch {
    return 'Enter a valid URL'
  }
  const platform = getPlatform(platformKey)
  if (platform && !platform.pattern.test(url)) return `URL must be a ${platform.label} link`
  return null
}

function truncateUrl(url, max = 48) {
  if (!url) return ''
  return url.length > max ? url.slice(0, max) + '...' : url
}

/* ── Saved review card ── */
function SavedReviewCard({ entry, onRemove }) {
  const platform = getPlatform(entry.platform)
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-all hover:border-slate-300">
      <span className="shrink-0">{platform?.logo}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{platform?.label || entry.platform}</p>
        <p className="text-[13px] text-slate-500 truncate">{truncateUrl(entry.url)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        aria-label={`Remove ${platform?.label || 'platform'}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

/* ── Add platform form (inline expand) ── */
function AddPlatformForm({ existingKeys, onSave, onCancel }) {
  const [step, setStep] = useState('picker') // 'picker' | 'url'
  const [selectedKey, setSelectedKey] = useState(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)
  const urlRef = useRef(null)

  const available = PLATFORMS.filter((p) => !existingKeys.includes(p.key))

  useEffect(() => {
    if (step === 'url' && urlRef.current) {
      urlRef.current.focus()
    }
  }, [step])

  const handleSelect = (key) => {
    setSelectedKey(key)
    setStep('url')
    setError(null)
    setUrl('')
  }

  const handleSave = () => {
    const err = validateUrl(url, selectedKey)
    if (err) {
      setError(err)
      return
    }
    onSave({ platform: selectedKey, url: url.trim() })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  if (available.length === 0) return null

  const selected = getPlatform(selectedKey)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
      {step === 'picker' ? (
        <>
          <p className="text-[13px] font-medium text-slate-600 mb-3">Select a platform</p>
          <div className="space-y-2">
            {available.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleSelect(p.key)}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <span className="shrink-0">{p.logo}</span>
                <span className="text-sm font-medium text-slate-700">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="shrink-0">{selected?.logo}</span>
            <p className="text-[13px] font-semibold text-slate-700">{selected?.label}</p>
          </div>
          <label className="block text-[13px] font-medium mb-1.5 text-slate-600">{selected?.label} URL</label>
          <input
            ref={urlRef}
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null) }}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (url.trim()) setError(validateUrl(url, selectedKey)) }}
            placeholder={selected?.placeholder}
            className={`w-full min-h-[44px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
              error ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {error && (
            <span className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{error}</span>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setStep('picker'); setSelectedKey(null); setUrl(''); setError(null) }}
              className="px-4 py-2 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!url.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Main section ── */
function ExternalReviewsSection() {
  const externalReviews = useProductBuilderStore((s) => s.externalReviews)
  const setField = useProductBuilderStore((s) => s.setField)
  const currentId = useProductBuilderStore((s) => s.currentId)
  const [showForm, setShowForm] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncError, setSyncError] = useState(null)

  const savedKeys = (externalReviews || []).map((r) => r.platform)
  const allAdded = savedKeys.length >= PLATFORMS.length

  const handleSave = (entry) => {
    setField('externalReviews', [...(externalReviews || []), entry])
    setShowForm(false)
  }

  const handleRemove = (index) => {
    setField('externalReviews', (externalReviews || []).filter((_, i) => i !== index))
  }

  const handleSync = async () => {
    if (!currentId || syncing) return
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await syncExternalReviews(currentId)
      setSyncResult(res.data?.data || { imported: 0, skipped: 0, errors: [] })
    } catch (err) {
      setSyncError(err.response?.data?.message || 'Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mb-5 pt-6 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="text-base font-semibold text-slate-800">Reviews from other platforms</h3>
        <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-[12px] font-medium text-teal-700">Optional</span>
      </div>
      <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
        Does this product already have reviews on other platforms? Add links so we can verify and import eligible reviews.
      </p>

      {/* Saved cards */}
      {(externalReviews || []).length > 0 && (
        <div className="space-y-2 mb-3">
          {externalReviews.map((entry, i) => (
            <SavedReviewCard key={entry.platform} entry={entry} onRemove={() => handleRemove(i)} />
          ))}
        </div>
      )}

      {/* Sync button — shown when URLs are configured and product is saved */}
      {(externalReviews || []).length > 0 && currentId && (
        <div className="mb-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing reviews...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
                Sync Reviews Now
              </>
            )}
          </button>

          {/* Sync result */}
          {syncResult && (
            <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <p className="text-[13px] text-emerald-700 font-medium">
                ✓ Imported {syncResult.imported} review{syncResult.imported !== 1 ? 's' : ''}
                {syncResult.skipped > 0 && ` (${syncResult.skipped} already synced)`}
              </p>
              {syncResult.errors?.length > 0 && (
                <p className="text-[12px] text-amber-600 mt-1">
                  {syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''} occurred during sync
                </p>
              )}
            </div>
          )}

          {/* Sync error */}
          {syncError && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-[13px] text-red-700">{syncError}</p>
            </div>
          )}
        </div>
      )}

      {/* Add platform button */}
      {!showForm && !allAdded && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add platform
        </button>
      )}

      {/* Inline form */}
      {showForm && (
        <AddPlatformForm
          existingKeys={savedKeys}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Confirmation checkbox */}
      {(externalReviews || []).length > 0 && (
        <>
          <div className="mt-4 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="review-confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="review-confirm" className="text-[13px] text-slate-600 leading-relaxed cursor-pointer">
              I confirm these links belong to my business or this experience.
            </label>
          </div>
          <p className="mt-2.5 text-[12px] text-slate-400 leading-relaxed">
            Imported reviews will be labelled with their original source platform.
          </p>
        </>
      )}
    </div>
  )
}

/* ── Step component ── */
export default function Step03Title() {
  const title = useProductBuilderStore((s) => s.title)
  const referenceCode = useProductBuilderStore((s) => s.referenceCode)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(2)

  const titleAtLimit = title.length >= TITLE_MAX_CHARS
  const refCodeAtLimit = referenceCode.length >= REFERENCE_CODE_MAX_CHARS

  return (
    <div className="max-w-[720px]">
      {/* ── Title ── */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Product title *</label>
        <input
          data-field="title"
          className={`w-full min-h-[46px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
            titleAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          type="text"
          value={title}
          onChange={(e) => setField('title', e.target.value)}
          maxLength={TITLE_MAX_CHARS}
          aria-invalid={!!errors.title || titleAtLimit}
          placeholder="e.g. Paris: Eiffel Tower Priority Access Tour"
        />
        {errors.title ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.title[0]}</span>
        ) : titleAtLimit ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{limitMessage(TITLE_MAX_CHARS)}</span>
        ) : null}
        <div className="flex items-center justify-between mt-1.5 gap-3">
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Describe the experience. Keep it clear and specific, avoid prices and promotional wording.
          </p>
          <span className={`text-[13px] tabular-nums shrink-0 ${titleAtLimit ? 'text-red-600 font-medium' : title.length > 0 ? 'text-slate-500' : 'text-slate-400'}`}>
            {title.length} / {TITLE_MAX_CHARS}
          </span>
        </div>
      </div>

      {/* ── Reference Code ── */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-slate-800">Product reference code</label>
        <input
          data-field="referenceCode"
          className={`w-full min-h-[46px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring ${
            refCodeAtLimit ? 'border-red-300 text-red-600' : 'border-slate-200'
          }`}
          type="text"
          value={referenceCode}
          onChange={(e) => setField('referenceCode', e.target.value)}
          maxLength={REFERENCE_CODE_MAX_CHARS}
          aria-invalid={!!errors.referenceCode || refCodeAtLimit}
          placeholder="Internal code (optional)"
        />
        {errors.referenceCode ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.referenceCode[0]}</span>
        ) : refCodeAtLimit ? (
          <span aria-live="polite" className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{limitMessage(REFERENCE_CODE_MAX_CHARS)}</span>
        ) : null}
        <div className="flex items-center justify-between mt-1.5 gap-3">
          <p className="text-[13px] text-slate-500 leading-relaxed">
            An internal code to help you identify this product. Not shown to customers.
          </p>
          <span className={`text-[13px] tabular-nums shrink-0 ${refCodeAtLimit ? 'text-red-600 font-medium' : referenceCode.length > 0 ? 'text-slate-500' : 'text-slate-400'}`}>
            {referenceCode.length} / {REFERENCE_CODE_MAX_CHARS}
          </span>
        </div>
      </div>

      {/* ── Reviews from other platforms ── */}
      <ExternalReviewsSection />
    </div>
  )
}
