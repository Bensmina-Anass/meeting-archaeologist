'use client'

import { useState } from 'react'

interface Props {
  transcript: string
}

export function TranscriptTab({ transcript }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!transcript) {
    return (
      <p className="text-[13px] py-6 text-center" style={{ color: '#96897B' }}>
        No transcript available.
      </p>
    )
  }

  const lines = transcript.split('\n')
  const PREVIEW_LINES = 30
  const isLong = lines.length > PREVIEW_LINES
  const visibleText = !expanded && isLong
    ? lines.slice(0, PREVIEW_LINES).join('\n')
    : transcript

  return (
    <div className="flex flex-col gap-3">
      <pre
        className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono nice-scroll"
        style={{
          color: 'rgba(0,78,100,0.75)',
          background: 'rgba(0,78,100,0.03)',
          border: '1px solid rgba(0,78,100,0.08)',
          borderRadius: 10,
          padding: '12px 14px',
          maxHeight: expanded ? 'none' : 360,
          overflow: expanded ? 'visible' : 'hidden',
          position: 'relative',
        }}
      >
        {visibleText}
        {!expanded && isLong && (
          <span
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(245,252,245,0), rgba(245,252,245,1))',
            }}
          />
        )}
      </pre>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[12px] font-medium self-center px-4 py-1.5 rounded-lg transition-colors hover:bg-[rgba(0,78,100,0.06)]"
          style={{ color: '#004E64', border: '1px solid rgba(0,78,100,0.14)' }}
        >
          {expanded ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  )
}
