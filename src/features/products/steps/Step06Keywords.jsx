import { useState, useMemo, useRef } from 'react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { requestKeyword as requestKeywordApi } from '@/features/products/api'
import { SUGGESTED_KEYWORDS } from '@/constants/keywords'
import { KEYWORD_CATEGORIES, CATEGORY_NAMES } from '@/constants/keywordCategories'

function KeywordChip({ kw, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
        selected
          ? 'bg-emerald-500 text-white border-emerald-500'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
    >
      {kw}
      {selected && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function Step06Keywords() {
  const keywords = useProductBuilderStore((s) => s.keywords)
  const addKeyword = useProductBuilderStore((s) => s.addKeyword)
  const addKeywords = useProductBuilderStore((s) => s.addKeywords)
  const removeKeyword = useProductBuilderStore((s) => s.removeKeyword)
  const errors = useStepErrors(6)
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const inputRef = useRef(null)

  const [advancedMode, setAdvancedMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categorySearch, setCategorySearch] = useState('')
  const categorySearchRef = useRef(null)

  const [quickCategory, setQuickCategory] = useState(null)

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return SUGGESTED_KEYWORDS
    const q = query.toLowerCase()
    return SUGGESTED_KEYWORDS.filter(
      (kw) => kw.toLowerCase().includes(q) && !keywords.includes(kw),
    ).slice(0, 50)
  }, [query, keywords])

  const trimmedQuery = query.trim()
  const isCustom =
    trimmedQuery &&
    !SUGGESTED_KEYWORDS.some((kw) => kw.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !keywords.includes(trimmedQuery)

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return CATEGORY_NAMES
    const q = categorySearch.toLowerCase()
    return CATEGORY_NAMES.filter((name) =>
      name.toLowerCase().includes(q) ||
      KEYWORD_CATEGORIES[name].some((kw) => kw.toLowerCase().includes(q)),
    )
  }, [categorySearch])

  const currentKeywords = useMemo(() => {
    if (!selectedCategory) return []
    return KEYWORD_CATEGORIES[selectedCategory] || []
  }, [selectedCategory])

  function selectKeyword(kw) {
    if (keywords.length >= 15) return
    addKeyword(kw)
    setQuery('')
    setShowSuggestions(false)
  }

  function handleRequest() {
    const kw = trimmedQuery
    if (!kw || keywords.includes(kw) || keywords.length >= 15 || requesting) return

    setRequesting(true)
    requestKeywordApi(kw)
      .then(() => {
        addKeyword(kw)
        setQuery('')
        setShowSuggestions(false)
        if (!advancedMode) inputRef.current?.focus()
      })
      .catch(() => {
        // Failed to request keyword — no toast in the builder
      })
      .finally(() => {
        setRequesting(false)
      })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = e.currentTarget.value.trim()
      if (!val || keywords.includes(val) || keywords.length >= 15) return

      const isPreApproved = SUGGESTED_KEYWORDS.some((kw) => kw.toLowerCase() === val.toLowerCase())
      if (isPreApproved) {
        selectKeyword(val)
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        handleRequest()
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  function toggleKeyword(kw) {
    if (keywords.includes(kw)) {
      removeKeyword(keywords.indexOf(kw))
    } else if (keywords.length < 15) {
      selectKeyword(kw)
      setQuery('')
    }
  }

  function addAllFromCategory() {
    if (!quickCategory) return
    const catKeywords = KEYWORD_CATEGORIES[quickCategory] || []
    addKeywords(catKeywords)
  }

  return (
    <div className="max-w-[720px]">
      <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
        <span className={`font-medium ${keywords.length >= 15 ? 'text-red-600' : 'text-slate-400'}`}>({keywords.length}/15)</span>{' '}
        Search suggested keywords or request a new one to help customers find your product.
        Think about theme, timing, who it&apos;s for, and what makes it unique.
      </p>

      {/* Selected keywords as chips */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full text-[13px] font-semibold text-emerald-700 border border-emerald-200"
            >
              {kw}
              <button
                onClick={() => removeKeyword(i)}
                type="button"
                className="bg-transparent border-0 cursor-pointer text-xs text-emerald-500 hover:text-red-500 p-0 leading-none"
              >
                {'\u2715'}
              </button>
            </span>
          ))}
        </div>
      )}

      {errors.keywords && <span className="text-[13px] text-red-600 font-medium mb-2 flex items-center gap-1">{errors.keywords[0]}</span>}
      {/* Search input with suggestions dropdown */}
      <div className="relative mb-4" data-field="keywords">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-sm transition-all focus-ring"
            type="text"
            placeholder={keywords.length >= 15 ? 'Max 15 keywords reached' : 'Search or type a keyword...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            disabled={keywords.length >= 15}
          />
        </div>

        {showSuggestions && (filteredSuggestions.length > 0 || isCustom) && keywords.length < 15 && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {filteredSuggestions.length > 0 && !query.trim() && (
              <div className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                Suggested keywords
              </div>
            )}
            <div className="max-h-[320px] overflow-y-auto">
              {filteredSuggestions.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-emerald-50 transition-colors border-0 bg-transparent cursor-pointer ${
                    keywords.includes(kw) ? 'text-emerald-600 font-medium' : 'text-slate-700'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    toggleKeyword(kw)
                  }}
                >
                  {keywords.includes(kw) && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <circle cx="7" cy="7" r="6" fill="#16a34a" />
                      <path d="M4.5 7L6.5 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {!keywords.includes(kw) && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <span>{kw}</span>
                </button>
              ))}
            </div>

            {isCustom && (
              <>
                {filteredSuggestions.length > 0 && (
                  <div className="border-t border-slate-100" />
                )}
                <button
                  type="button"
                  onClick={handleRequest}
                  disabled={requesting}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-amber-50 transition-colors border-0 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center justify-center text-xs font-bold shrink-0">
                    +
                  </span>
                  <span>
                    Request <strong className="text-slate-800">&quot;{trimmedQuery}&quot;</strong> as a keyword
                  </span>
                  {requesting && (
                    <svg className="animate-spin h-4 w-4 text-slate-400 ml-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick select row */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Quick add by category
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_NAMES.map((name) => {
            const count = KEYWORD_CATEGORIES[name].length
            const isActive = quickCategory === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setQuickCategory(isActive ? null : name)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  isActive
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {name}
                <span className={`ml-1 text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {quickCategory && (
          <div className="mt-3 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-slate-700">{quickCategory}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={addAllFromCategory}
                  disabled={keywords.length >= 15}
                  className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border-0 cursor-pointer p-0"
                >
                  Add all
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCategory(null)}
                  className="text-[12px] font-medium text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {KEYWORD_CATEGORIES[quickCategory].map((kw) => (
                <KeywordChip
                  key={kw}
                  kw={kw}
                  selected={keywords.includes(kw)}
                  onClick={() => toggleKeyword(kw)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-slate-100 my-5" />

      {/* Toggle - bottom-right */}
      <div className="flex justify-end items-center gap-3 mb-4">
        <span className="text-[13px] text-slate-500">Advanced search</span>
        <button
          type="button"
          onClick={() => {
            const next = !advancedMode
            setAdvancedMode(next)
            setShowSuggestions(false)
            if (next && !selectedCategory) {
              setSelectedCategory(CATEGORY_NAMES[0])
            }
          }}
          className={`relative w-10 h-5 rounded-full transition-colors border-0 cursor-pointer ${
            advancedMode ? 'bg-[#0071eb]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
              advancedMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {advancedMode && (
        <div className="border border-slate-200 rounded">
          <div className="flex min-h-[400px]">
            {/* Left: categories */}
            <div className="w-[200px] shrink-0 flex flex-col bg-slate-50">
              <div className="p-2">
                <input
                  ref={categorySearchRef}
                  className="w-full h-8 border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-emerald-500 transition-colors"
                  type="text"
                  placeholder="Filter categories..."
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value)
                    if (!selectedCategory || !CATEGORY_NAMES.includes(selectedCategory) || !filteredCategories.includes(selectedCategory)) {
                      setSelectedCategory(filteredCategories.length > 0 ? filteredCategories[0] : null)
                    }
                  }}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredCategories.map((name) => {
                  const count = KEYWORD_CATEGORIES[name].length
                  const isActive = selectedCategory === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedCategory(name)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-[13px] transition-colors border-0 cursor-pointer ${
                        isActive
                          ? 'bg-white text-slate-900 font-medium shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-slate-100'
                      } ${isActive ? '' : 'border-b border-slate-100'}`}
                    >
                      <span className="truncate">{name}</span>
                      <span className={`shrink-0 ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-[#0071eb] text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
                {filteredCategories.length === 0 && (
                  <div className="px-3 py-6 text-[13px] text-slate-400 text-center">
                    No categories match
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="w-px bg-slate-200" />

            {/* Right: keywords */}
            <div className="flex-1 p-5 overflow-y-auto">
              {selectedCategory ? (
                <>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">{selectedCategory}</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentKeywords.map((kw) => (
                      <KeywordChip
                        key={kw}
                        kw={kw}
                        selected={keywords.includes(kw)}
                        onClick={() => toggleKeyword(kw)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-[13px] text-slate-400">
                  Select a category to view keywords
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
