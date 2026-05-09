'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, Eyebrow, Pill } from '@/components/ui'
import { dismissContradiction } from '@/lib/api'
import type { EnrichedContradiction } from '@/types/api'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const SEVERITY_TONE = {
  high: 'burg',
  medium: 'medium',
  low: 'low',
} as const

function SeverityPill({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  return (
    <Pill tone={SEVERITY_TONE[severity]}>
      {severity.toUpperCase()}
    </Pill>
  )
}

function ContradictionCard({
  c,
  onDismiss,
}: {
  c: EnrichedContradiction
  onDismiss: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleDismiss = () => {
    startTransition(async () => {
      try {
        await dismissContradiction(c.id)
        onDismiss(c.id)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to dismiss')
      }
    })
  }

  return (
    <Card flagged className="p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityPill severity={c.severity} />
          <span
            className="font-mono text-[10px] uppercase"
            style={{ color: '#96897B', letterSpacing: '0.14em' }}
          >
            {c.topic_slug}
          </span>
          <Link
            href={`/topics/${c.topic_id}`}
            className="no-underline text-[10.5px] font-mono"
            style={{ color: '#CE6C47', letterSpacing: '0.04em' }}
          >
            → {c.topic_display_name}
          </Link>
        </div>
        <span
          className="font-mono text-[10px] flex-shrink-0"
          style={{ color: '#96897B', letterSpacing: '0.04em' }}
        >
          Detected {fmtDate(c.detected_at)}
        </span>
      </div>

      {/* Two-column decisions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Decision A */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'rgba(0,78,100,0.04)',
            border: '1px solid rgba(0,78,100,0.12)',
          }}
        >
          <div
            className="font-mono text-[9.5px] uppercase mb-1.5"
            style={{ color: '#96897B', letterSpacing: '0.14em' }}
          >
            Earlier ·{' '}
            <Link href={`/meetings/${c.decision_a.meeting_id}`} className="no-underline" style={{ color: '#004E64' }}>
              {c.decision_a.meeting_id}
            </Link>
          </div>
          <p className="text-[12.5px] leading-snug" style={{ color: '#004E64' }}>
            {c.decision_a.summary}
          </p>
        </div>

        {/* Decision B */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'rgba(107,39,55,0.04)',
            border: '1px solid rgba(107,39,55,0.20)',
          }}
        >
          <div
            className="font-mono text-[9.5px] uppercase mb-1.5"
            style={{ color: '#6B2737', letterSpacing: '0.14em' }}
          >
            Later ·{' '}
            <Link href={`/meetings/${c.decision_b.meeting_id}`} className="no-underline" style={{ color: '#6B2737' }}>
              {c.decision_b.meeting_id}
            </Link>
          </div>
          <p className="text-[12.5px] leading-snug" style={{ color: '#6B2737' }}>
            {c.decision_b.summary}
          </p>
        </div>
      </div>

      {/* Explanation */}
      {c.explanation && (
        <div
          className="rounded-lg p-3 mb-4 text-[12.5px] leading-relaxed"
          style={{
            background: 'rgba(107,39,55,0.04)',
            border: '1px solid rgba(107,39,55,0.15)',
            color: '#6B2737',
          }}
        >
          {c.explanation}
        </div>
      )}

      {/* Dismiss */}
      <div className="flex justify-end">
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-opacity disabled:opacity-50"
          style={{
            background: 'rgba(150,137,123,0.10)',
            color: '#96897B',
            border: '1px solid rgba(150,137,123,0.25)',
          }}
        >
          {isPending ? 'Dismissing…' : 'Dismiss'}
        </button>
      </div>
    </Card>
  )
}

interface ContradictionsListProps {
  initialContradictions: EnrichedContradiction[]
  showDismissed: boolean
}

export function ContradictionsList({
  initialContradictions,
}: ContradictionsListProps) {
  const [items, setItems] = useState(initialContradictions)

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'rgba(0,78,100,0.06)', color: '#004E64' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>
        <p className="font-serif text-[22px]" style={{ color: '#96897B' }}>
          No contradictions
        </p>
        <p className="text-[13px] mt-1" style={{ color: '#96897B' }}>
          All clear — no conflicting decisions found.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((c) => (
        <ContradictionCard key={c.id} c={c} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
