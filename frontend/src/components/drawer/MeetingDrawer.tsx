'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { topicColor } from '@/lib/colors'
import { fetchMeetingDetail } from '@/lib/api'
import { DecisionsTab } from './DecisionsTab'
import { ContradictionsTab } from './ContradictionsTab'
import { TranscriptTab } from './TranscriptTab'
import type { CalendarMeeting, CalendarMeetingDetail } from '@/types/calendar'

type Tab = 'decisions' | 'contradictions' | 'transcript'

interface Props {
  meetingId: string | null
  allMeetings: CalendarMeeting[]
  onClose: () => void
  onMeetingClick: (id: string) => void
}

export function MeetingDrawer({ meetingId, allMeetings, onClose, onMeetingClick }: Props) {
  const [detail, setDetail] = useState<CalendarMeetingDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('decisions')

  useEffect(() => {
    if (!meetingId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMeetingDetail(meetingId)
      .then((d) => { if (!cancelled) { setDetail(d); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [meetingId])

  // Reset tab when meeting changes
  useEffect(() => { setTab('decisions') }, [meetingId])

  const open = meetingId !== null

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'rgba(0,30,40,0.12)',
          opacity: open ? 1 : 0,
          transition: 'opacity 220ms ease',
          zIndex: 30,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="absolute right-0 top-0 h-full flex flex-col"
        style={{
          width: 380,
          background: '#FAFFF9',
          borderLeft: '1px solid rgba(0,78,100,0.12)',
          boxShadow: open ? '-12px 0 40px -12px rgba(0,78,100,0.14)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 240ms cubic-bezier(0.32,0,0.08,1), box-shadow 240ms ease',
          zIndex: 40,
          overflow: 'hidden',
        }}
      >
        {open && (
          <>
            {/* Header */}
            <div
              className="flex-shrink-0 px-5 pt-4 pb-3"
              style={{ borderBottom: '1px solid rgba(0,78,100,0.10)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {loading && (
                    <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(0,78,100,0.10)', width: '60%' }} />
                  )}
                  {!loading && detail && (
                    <>
                      <p className="font-mono text-[11px] mb-1" style={{ color: '#96897B' }}>
                        {format(new Date(detail.date + 'T00:00:00'), 'MMMM d, yyyy')}
                      </p>
                      <h2 className="font-serif text-[17px] leading-snug" style={{ color: '#004E64' }}>
                        {detail.title}
                      </h2>
                      {detail.attendees.length > 0 && (
                        <p className="mt-1 text-[11.5px] font-mono" style={{ color: '#96897B' }}>
                          {detail.attendees.join(', ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,78,100,0.06)]"
                  style={{ color: '#96897B' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Topic pills */}
              {!loading && detail && detail.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {detail.topics.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full font-mono text-[10px]"
                      style={{
                        background: `${topicColor(t)}18`,
                        color: topicColor(t),
                        border: `1px solid ${topicColor(t)}30`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mt-3">
                {(['decisions', 'contradictions', 'transcript'] as Tab[]).map((t) => {
                  const active = tab === t
                  const badge = t === 'contradictions' && detail?.contradictions.length
                    ? detail.contradictions.length
                    : t === 'decisions' && detail?.decisions.length
                    ? detail.decisions.length
                    : null
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                      style={{
                        background: active ? (t === 'contradictions' ? 'rgba(107,39,55,0.08)' : 'rgba(0,78,100,0.08)') : 'transparent',
                        color: active ? (t === 'contradictions' ? '#6B2737' : '#004E64') : '#96897B',
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                      {badge !== null && (
                        <span
                          className="text-[10px] font-mono px-1 rounded"
                          style={{
                            background: t === 'contradictions' ? 'rgba(107,39,55,0.14)' : 'rgba(0,78,100,0.12)',
                            color: t === 'contradictions' ? '#6B2737' : '#004E64',
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto nice-scroll px-5 py-4">
              {loading && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(0,78,100,0.06)' }} />
                  ))}
                </div>
              )}
              {error && (
                <p className="text-[13px] text-center py-6" style={{ color: '#6B2737' }}>
                  Failed to load: {error}
                </p>
              )}
              {!loading && !error && detail && (
                <>
                  {tab === 'decisions' && <DecisionsTab decisions={detail.decisions} />}
                  {tab === 'contradictions' && (
                    <ContradictionsTab
                      contradictions={detail.contradictions}
                      allMeetings={allMeetings}
                      onMeetingClick={onMeetingClick}
                    />
                  )}
                  {tab === 'transcript' && <TranscriptTab transcript={detail.transcript} />}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
