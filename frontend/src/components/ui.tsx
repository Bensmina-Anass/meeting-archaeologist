import React from 'react'

// ── Pill ─────────────────────────────────────────────────────────────────────

type PillTone = 'muted' | 'teal' | 'burg' | 'accent' | 'low' | 'medium' | 'high'

const PILL_TONES: Record<
  PillTone,
  { bg: string; fg: string; border: string }
> = {
  muted:  { bg: 'rgba(150,137,123,0.12)', fg: '#004E64', border: 'rgba(150,137,123,0.30)' },
  teal:   { bg: 'rgba(0,78,100,0.08)',    fg: '#004E64', border: 'rgba(0,78,100,0.18)' },
  burg:   { bg: 'rgba(107,39,55,0.08)',   fg: '#6B2737', border: 'rgba(107,39,55,0.30)' },
  accent: { bg: '#CE6C47',               fg: '#FFFFFF', border: 'transparent' },
  low:    { bg: 'rgba(150,137,123,0.12)', fg: '#96897B', border: 'rgba(150,137,123,0.30)' },
  medium: { bg: 'rgba(206,108,71,0.10)',  fg: '#CE6C47', border: 'rgba(206,108,71,0.30)' },
  high:   { bg: 'rgba(107,39,55,0.08)',   fg: '#6B2737', border: 'rgba(107,39,55,0.30)' },
}

interface PillProps {
  tone?: PillTone
  children: React.ReactNode
  className?: string
}

export function Pill({ tone = 'muted', children, className = '' }: PillProps) {
  const t = PILL_TONES[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${className}`}
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
    >
      {children}
    </span>
  )
}

// ── Eyebrow label ─────────────────────────────────────────────────────────────

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10.5px] uppercase"
      style={{ color: '#96897B', letterSpacing: '0.16em' }}
    >
      {children}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="font-serif mt-1"
      style={{ fontSize: 40, color: '#004E64', letterSpacing: '-0.005em', lineHeight: 1.05 }}
    >
      {children}
    </h1>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  flagged?: boolean
}

export function Card({ children, flagged, className = '', style, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={`bg-white rounded-xl ${className}`}
      style={{
        border: flagged
          ? '1px solid rgba(107,39,55,0.35)'
          : '1px solid rgba(150,137,123,0.28)',
        boxShadow: flagged
          ? '0 0 0 3px rgba(107,39,55,0.06)'
          : '0 1px 0 rgba(0,78,100,0.02), 0 8px 30px -22px rgba(0,78,100,0.18)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Error banner ──────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium mb-6"
      style={{
        background: 'rgba(107,39,55,0.08)',
        border: '1px solid rgba(107,39,55,0.30)',
        color: '#6B2737',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={15} height={15} className="flex-shrink-0">
        <path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.4 14.18A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.7-2.96L10.3 3.86z"/>
        <path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
      {message}
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="bg-white rounded-xl p-5 skeleton-pulse"
      style={{ border: '1px solid rgba(150,137,123,0.28)' }}
    >
      <div
        className="h-3 rounded mb-3"
        style={{ background: '#96897B', opacity: 0.3, width: '40%' }}
      />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded mb-2"
          style={{
            background: '#96897B',
            opacity: 0.2,
            width: i === lines - 1 ? '65%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <p className="font-serif text-[22px]" style={{ color: '#96897B' }}>
        {label}
      </p>
    </div>
  )
}

// ── Confidence badge ──────────────────────────────────────────────────────────

export function ConfidencePill({
  confidence,
}: {
  confidence: 'explicit' | 'implied' | 'tentative'
}) {
  const map: Record<string, PillTone> = {
    explicit: 'teal',
    implied: 'muted',
    tentative: 'medium',
  }
  return <Pill tone={map[confidence] ?? 'muted'}>{confidence}</Pill>
}
