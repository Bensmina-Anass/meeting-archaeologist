'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from './icons'
import { fetchMeetingDetail, streamChat } from '@/lib/api'
import { topicColor } from '@/lib/colors'
import type { CalendarMeeting, CalendarMeetingDetail, CalendarDecision } from '@/types/calendar'

const C = { teal: '#004E64', burgundy: '#6B2737', muted: '#96897B', accent: '#CE6C47', canvas: '#EDFFEC' }

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function DecisionCard({ d, onJump }: { d: CalendarDecision & { contradicts?: { meeting: string; previous: string; decidedOn: string } }; onJump?: () => void }) {
  return (
    <article
      className="rounded-xl p-4"
      style={{
        background: '#FFFFFF',
        border: d.contradicts ? '1px solid rgba(107,39,55,0.35)' : '1px solid rgba(150,137,123,0.25)',
        boxShadow: d.contradicts ? '0 0 0 3px rgba(107,39,55,0.06)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase" style={{ color: C.muted, letterSpacing: '0.14em' }}>Topic</div>
          <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: topicColor(d.topic) }}>{d.topic}</div>
        </div>
        {d.owner && (
          <div
            className="rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
            style={{ width: 26, height: 26, background: topicColor(d.topic), fontSize: 10, letterSpacing: '0.02em' }}
            title={d.owner}
          >
            {d.owner.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="font-mono text-[10px] uppercase" style={{ color: C.muted, letterSpacing: '0.14em' }}>Decision</div>
        <p className="text-[13px] leading-snug mt-0.5" style={{ color: C.teal }}>{d.decision}</p>
      </div>

      {(d.owner || d.rationale) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {d.owner && (
            <div>
              <div className="font-mono text-[10px] uppercase" style={{ color: C.muted, letterSpacing: '0.14em' }}>Owner</div>
              <div className="text-[12px] mt-0.5" style={{ color: C.teal }}>{d.owner}</div>
            </div>
          )}
          {d.rationale && (
            <div>
              <div className="font-mono text-[10px] uppercase" style={{ color: C.muted, letterSpacing: '0.14em' }}>Quote</div>
              <div className="text-[11.5px] leading-snug mt-0.5 italic" style={{ color: 'rgba(0,78,100,0.72)' }}>{d.rationale}</div>
            </div>
          )}
        </div>
      )}

      {d.contradicts && (
        <div className="mt-3.5 rounded-lg p-3 flex items-start gap-2.5"
             style={{ background: 'rgba(107,39,55,0.06)', border: '1px solid rgba(107,39,55,0.25)' }}>
          <Icon.Alert width={15} height={15} style={{ color: C.burgundy, flexShrink: 0, marginTop: 1 }}/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: 'rgba(107,39,55,0.08)', color: C.burgundy, border: '1px solid rgba(107,39,55,0.30)' }}>
                Contradicts earlier decision
              </span>
              <span className="text-[10.5px] font-mono" style={{ color: C.muted }}>{d.contradicts.decidedOn}</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-snug" style={{ color: C.burgundy }}>
              <span className="opacity-70">Previously in </span>
              <span className="font-semibold">"{d.contradicts.meeting}":</span>{' '}
              <span className="italic">"{d.contradicts.previous}"</span>
            </p>
            {onJump && (
              <button onClick={onJump}
                      className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold underline-offset-2 hover:underline"
                      style={{ color: C.burgundy }}>
                <Icon.Link width={11} height={11}/> View conflict
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

type HistoryEntry = { from: 'sys' | 'you' | 'arch'; text: string }

function ChatComposer({
  meetingId,
  meetingTitle,
  onClose,
}: {
  meetingId: string
  meetingTitle: string
  onClose: () => void
}) {
  const [val, setVal] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([
    { from: 'sys', text: `Asking Archaeologist about "${meetingTitle}".` },
  ])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  // Scroll to bottom whenever history changes
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history])

  async function send() {
    const v = val.trim()
    if (!v || streaming) return
    setVal('')
    setError(null)
    setStreaming(true)

    // Build API payload from current history before mutating state
    const apiMessages = [
      ...history.filter(m => m.from === 'you' || m.from === 'arch').map(m => ({
        role: (m.from === 'you' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: v },
    ]

    setHistory(h => [...h, { from: 'you', text: v }, { from: 'arch', text: '' }])

    try {
      const res = await streamChat(meetingId, apiMessages)
      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText)
        throw new Error(`${res.status}: ${msg}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setHistory(h => {
          const last = h[h.length - 1]
          return [...h.slice(0, -1), { ...last, text: last.text + chunk }]
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg)
      // Drop the empty placeholder on error
      setHistory(h => (h[h.length - 1]?.text === '' ? h.slice(0, -1) : h))
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setHistory([{ from: 'sys', text: `Asking Archaeologist about "${meetingTitle}".` }])
    setError(null)
  }

  return (
    <div className="rounded-2xl p-3" style={{ background: C.teal, boxShadow: '0 18px 36px -16px rgba(0,78,100,0.45)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(206,108,71,0.85)' }}>
            <Icon.Sparkle width={12} height={12} style={{ color: '#fff' }}/>
          </span>
          <div>
            <div className="text-[12px] font-semibold" style={{ color: '#EDFFEC' }}>Archaeologist</div>
            <div className="text-[9.5px] font-mono uppercase" style={{ color: 'rgba(237,255,236,0.5)', letterSpacing: '0.12em' }}>scoped to this meeting</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            title="Clear chat"
            className="p-1 rounded text-[10px] font-mono hover:bg-white/10"
            style={{ color: 'rgba(237,255,236,0.55)' }}
          >
            clear
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10" style={{ color: 'rgba(237,255,236,0.7)' }}>
            <Icon.X width={14} height={14}/>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="space-y-2 mb-2 max-h-[200px] overflow-y-auto nice-scroll px-1">
        {history.map((m, i) => {
          const isStreamingPlaceholder = streaming && i === history.length - 1 && m.from === 'arch'
          return (
            <div key={i} className="text-[12px] leading-snug rounded-lg px-3 py-2"
                 style={{
                   background: m.from === 'you' ? '#EDFFEC' : (m.from === 'sys' ? 'transparent' : 'rgba(237,255,236,0.08)'),
                   color: m.from === 'you' ? C.teal : (m.from === 'sys' ? 'rgba(237,255,236,0.55)' : '#EDFFEC'),
                   border: m.from === 'sys' ? '1px dashed rgba(237,255,236,0.18)' : 'none',
                   fontStyle: m.from === 'sys' ? 'italic' : 'normal',
                   fontSize: m.from === 'sys' ? 11 : 12,
                 }}>
              {m.text || (isStreamingPlaceholder ? <span style={{ opacity: 0.5 }}>●●●</span> : '')}
            </div>
          )
        })}
        {error && (
          <div className="text-[11px] rounded-lg px-3 py-2"
               style={{ background: 'rgba(107,39,55,0.3)', color: '#FFCDD2' }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 rounded-xl px-3 py-2"
           style={{ background: '#EDFFEC', border: '1px solid rgba(237,255,236,0.4)' }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything… Enter to send, Shift+Enter for newline"
          className="flex-1 bg-transparent outline-none text-[13px] resize-none"
          style={{ color: C.teal, maxHeight: 72, overflowY: 'auto', lineHeight: '1.4' }}
        />
        <button
          onClick={send}
          disabled={!val.trim() || streaming}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          style={{ background: C.accent, color: '#fff' }}
        >
          <Icon.Send width={14} height={14}/>
        </button>
      </div>
    </div>
  )
}

function TranscriptSection({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false)
  const lines = transcript.split('\n')

  return (
    <section className="px-6 pt-7 pb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="font-mono text-[10.5px] uppercase" style={{ color: C.muted, letterSpacing: '0.18em' }}>
          Source material
        </h4>
      </div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition"
        style={{ background: '#FAFFF9', border: `1px solid ${open ? 'rgba(0,78,100,0.4)' : 'rgba(150,137,123,0.28)'}` }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,78,100,0.4)')}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(150,137,123,0.28)' }}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-md" style={{ background: 'rgba(0,78,100,0.06)', color: C.teal }}>
          <Icon.Transcript width={15} height={15}/>
        </span>
        <span className="flex-1 text-left">
          <span className="block text-[12.5px] font-semibold" style={{ color: C.teal }}>Transcript</span>
          <span className="block text-[10px] font-mono" style={{ color: C.muted }}>
            {lines.length} lines
          </span>
        </span>
        <span style={{ color: C.muted, fontSize: 14, lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <pre
          className="mt-2 text-[11.5px] leading-relaxed whitespace-pre-wrap font-mono nice-scroll"
          style={{
            color: 'rgba(0,78,100,0.78)',
            background: 'rgba(0,78,100,0.03)',
            border: '1px solid rgba(0,78,100,0.08)',
            borderRadius: 10,
            padding: '12px 14px',
            maxHeight: 340,
            overflowY: 'auto',
          }}
        >
          {transcript}
        </pre>
      )}
    </section>
  )
}

interface Props {
  meetingId: string | null
  allMeetings: CalendarMeeting[]
  onMeetingClick: (id: string) => void
  onClose: () => void
}

export function MeetingDetailPane({ meetingId, allMeetings, onMeetingClick, onClose }: Props) {
  const [detail, setDetail] = useState<CalendarMeetingDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (!meetingId) { setDetail(null); return }
    let cancelled = false
    setLoading(true)
    setDetail(null)
    fetchMeetingDetail(meetingId)
      .then(d => { if (!cancelled) { setDetail(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [meetingId])

  useEffect(() => { setChatOpen(false) }, [meetingId])

  if (!meetingId) {
    return (
      <aside className="flex flex-col items-center justify-center px-8 text-center"
             style={{ width: 380, background: '#FFFFFF', borderLeft: '1px solid rgba(150,137,123,0.25)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
             style={{ background: 'rgba(0,78,100,0.06)', color: C.teal }}>
          <Icon.Folder width={22} height={22}/>
        </div>
        <h3 className="font-serif text-[22px]" style={{ color: C.teal }}>No meeting selected</h3>
        <p className="text-[12.5px] mt-2 max-w-[260px]" style={{ color: C.muted }}>
          Click any meeting on a project timeline to open the record, decisions, and chat.
        </p>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col" style={{ width: 380, background: '#FFFFFF', borderLeft: '1px solid rgba(150,137,123,0.25)' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(150,137,123,0.20)' }}>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {detail?.has_contradiction && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium"
                    style={{ background: 'rgba(107,39,55,0.08)', color: C.burgundy, border: '1px solid rgba(107,39,55,0.30)' }}>
                <Icon.Alert width={9} height={9}/>contradiction
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5" style={{ color: C.muted }}>
            <Icon.X width={15} height={15}/>
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="h-7 rounded animate-pulse" style={{ background: 'rgba(0,78,100,0.08)', width: '70%' }}/>
            <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(0,78,100,0.06)', width: '50%' }}/>
          </div>
        )}

        {!loading && detail && (
          <>
            <h2 className="font-serif text-[26px] leading-[1.1]" style={{ color: C.teal, letterSpacing: '-0.005em' }}>
              {detail.title}
            </h2>
            <div className="mt-2 flex items-center gap-3 text-[11.5px]" style={{ color: C.muted }}>
              <span className="inline-flex items-center gap-1.5">
                <Icon.Clock width={12} height={12}/>
                <span className="font-mono" style={{ letterSpacing: '0.02em' }}>{fmtDate(detail.date)}</span>
              </span>
            </div>

            {detail.attendees.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {detail.attendees.slice(0, 5).map((a, i) => (
                    <div key={a}
                         className="rounded-full flex items-center justify-center text-white font-medium"
                         style={{ zIndex: 10 - i, width: 26, height: 26, background: topicColor(a), fontSize: 10, boxShadow: '0 0 0 2px #fff' }}
                         title={a}>
                      {a.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="text-[11.5px]" style={{ color: 'rgba(0,78,100,0.78)' }}>
                  <span className="font-medium">{detail.attendees.slice(0, 3).join(', ')}</span>
                  {detail.attendees.length > 3 && <span style={{ color: C.muted }}> +{detail.attendees.length - 3} more</span>}
                </div>
              </div>
            )}

            {detail.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.topics.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full font-mono text-[10px]"
                        style={{ background: `${topicColor(t)}18`, color: topicColor(t), border: `1px solid ${topicColor(t)}30` }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto nice-scroll" style={{ paddingBottom: chatOpen ? 0 : 84 }}>
        {!loading && detail && (
          <>
            {/* Decisions */}
            <section className="px-6 pt-5">
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="font-mono text-[10.5px] uppercase" style={{ color: C.muted, letterSpacing: '0.18em' }}>
                  Decisions logged · {detail.decisions.length}
                </h4>
              </div>
              <div className="flex flex-col gap-2.5">
                {detail.decisions.length === 0 && (
                  <p className="text-[12.5px] py-4 text-center" style={{ color: C.muted }}>No decisions extracted.</p>
                )}
                {detail.decisions.map((d, i) => {
                  const contradiction = detail.contradictions.find(c => c.decision === d.decision)
                  const enriched = contradiction ? {
                    ...d,
                    contradicts: {
                      meeting: contradiction.conflicting_meeting_title,
                      previous: contradiction.conflicting_decision,
                      decidedOn: contradiction.conflicting_meeting_date,
                    },
                  } : d
                  return (
                    <DecisionCard
                      key={i}
                      d={enriched}
                      onJump={contradiction ? () => onMeetingClick(contradiction.conflicting_meeting_id) : undefined}
                    />
                  )
                })}
              </div>
            </section>

            {/* Transcript */}
            {detail.transcript && (
              <TranscriptSection transcript={detail.transcript} />
            )}
          </>
        )}
      </div>

      {/* Chat CTA */}
      <div className="px-5 pb-5 pt-2" style={{ background: 'linear-gradient(to top, #FFFFFF 60%, rgba(255,255,255,0))' }}>
        {chatOpen ? (
          <ChatComposer meetingId={meetingId} meetingTitle={detail?.title ?? ''} onClose={() => setChatOpen(false)}/>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl transition hover:brightness-110"
            style={{ background: C.accent, color: '#fff', boxShadow: '0 10px 24px -10px rgba(206,108,71,0.55)' }}
          >
            <Icon.Chat width={16} height={16}/>
            <span className="font-semibold text-[13.5px]">Ask about this meeting</span>
          </button>
        )}
      </div>
    </aside>
  )
}
