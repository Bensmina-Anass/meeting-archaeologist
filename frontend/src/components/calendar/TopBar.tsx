'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { topicColor } from '@/lib/colors'

interface Props {
  year: number
  month: number
  allTopics: string[]
  topicFilter: string[]
  contradictionOnly: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onTopicFilterChange: (topics: string[]) => void
  onContradictionToggle: (v: boolean) => void
}

function TopicPicker({
  allTopics,
  selected,
  onChange,
}: {
  allTopics: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug])
  }

  const label = selected.length === 0 ? 'All topics' : `${selected.length} topic${selected.length > 1 ? 's' : ''}`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
        style={{
          background: selected.length > 0 ? 'rgba(0,78,100,0.08)' : 'rgba(0,78,100,0.04)',
          border: '1px solid rgba(0,78,100,0.14)',
          color: '#004E64',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        {label}
        {selected.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange([]) }}
            className="ml-1 opacity-50 hover:opacity-100"
          >
            ×
          </button>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden z-50 nice-scroll"
          style={{
            background: '#fff',
            border: '1px solid rgba(0,78,100,0.14)',
            boxShadow: '0 8px 30px -8px rgba(0,78,100,0.18)',
            minWidth: 220,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {allTopics.length === 0 && (
            <div className="px-4 py-3 text-[12px]" style={{ color: '#96897B' }}>No topics yet</div>
          )}
          {allTopics.map((slug) => {
            const active = selected.includes(slug)
            return (
              <button
                key={slug}
                onClick={() => toggle(slug)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(0,78,100,0.04)]"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: topicColor(slug), opacity: active ? 1 : 0.3 }}
                />
                <span
                  className="font-mono text-[11.5px] flex-1"
                  style={{ color: active ? '#004E64' : '#96897B' }}
                >
                  {slug}
                </span>
                {active && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#004E64" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={12} height={12}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TopBar({
  year, month, allTopics, topicFilter, contradictionOnly,
  onPrev, onNext, onToday, onTopicFilterChange, onContradictionToggle,
}: Props) {
  const monthDate = new Date(year, month - 1, 1)
  const monthLabel = format(monthDate, 'MMMM yyyy')

  return (
    <div
      className="flex items-center gap-4 px-5 flex-shrink-0"
      style={{
        height: 52,
        borderBottom: '1px solid rgba(0,78,100,0.10)',
        background: 'rgba(237,255,236,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-2 mr-2 flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="1.6" rx="0.6" fill="#004E64" />
          <rect x="3" y="6" width="10" height="1.6" rx="0.6" fill="#CE6C47" />
          <rect x="2" y="9" width="12" height="1.6" rx="0.6" fill="#004E64" opacity="0.5" />
          <rect x="4" y="12" width="8" height="1.6" rx="0.6" fill="#004E64" opacity="0.25" />
        </svg>
        <span className="font-serif text-[15px]" style={{ color: '#004E64' }}>
          Meeting <span style={{ color: '#CE6C47', fontStyle: 'italic' }}>Archaeologist</span>
        </span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,78,100,0.06)]"
          style={{ color: '#004E64' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <span className="font-serif text-[17px] px-2 min-w-[148px] text-center" style={{ color: '#004E64' }}>
          {monthLabel}
        </span>
        <button
          onClick={onNext}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,78,100,0.06)]"
          style={{ color: '#004E64' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
        <button
          onClick={onToday}
          className="ml-1 px-3 py-1 rounded-lg text-[11.5px] font-medium transition-colors hover:bg-[rgba(0,78,100,0.06)]"
          style={{ color: '#004E64', border: '1px solid rgba(0,78,100,0.14)' }}
        >
          Today
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Filters */}
      <TopicPicker allTopics={allTopics} selected={topicFilter} onChange={onTopicFilterChange} />

      {/* Contradiction toggle */}
      <button
        onClick={() => onContradictionToggle(!contradictionOnly)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
        style={{
          background: contradictionOnly ? 'rgba(107,39,55,0.08)' : 'rgba(0,78,100,0.04)',
          border: contradictionOnly ? '1px solid rgba(107,39,55,0.28)' : '1px solid rgba(0,78,100,0.14)',
          color: contradictionOnly ? '#6B2737' : '#004E64',
        }}
      >
        <span
          className="w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ background: contradictionOnly ? '#6B2737' : 'rgba(150,137,123,0.5)' }}
        />
        Contradictions only
      </button>
    </div>
  )
}
