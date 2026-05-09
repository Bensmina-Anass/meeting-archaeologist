'use client'

import { useState, useMemo } from 'react'
import { Icon } from './icons'
import { topicColor } from '@/lib/colors'
import type { CalendarMeeting } from '@/types/calendar'

const C = { teal: '#004E64', burgundy: '#6B2737', muted: '#96897B', accent: '#CE6C47', canvas: '#EDFFEC' }

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfWeek(d: Date): Date {
  const day = d.getDay() // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day) // shift to Mon
  const result = new Date(d)
  result.setDate(d.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function miniMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface Props {
  meetings: CalendarMeeting[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function WeekCalendarView({ meetings, selectedId, onSelect }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Agenda'>('Week')

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }), [weekStart])

  const todayIso = isoDate(new Date())

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>()
    for (const m of meetings) {
      const arr = map.get(m.date) ?? []
      arr.push(m)
      map.set(m.date, arr)
    }
    return map
  }, [meetings])

  const monthGrid = useMemo(() => {
    const ref = weekStart
    return miniMonthGrid(ref.getFullYear(), ref.getMonth())
  }, [weekStart])

  const todayAgenda = meetingsByDay.get(todayIso) ?? []

  const totalIndexed = meetings.length

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d)
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d)
  }
  function goToday() { setWeekStart(startOfWeek(new Date())) }

  const weekLabel = (() => {
    const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6)
    const s = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${s} — ${e}`
  })()

  return (
    <main className="flex-1 min-w-0 flex flex-col paper-grain" style={{ background: C.canvas }}>
      {/* Header */}
      <div className="px-10 pt-9 pb-5 flex items-end gap-6 border-b" style={{ borderColor: 'rgba(150,137,123,0.25)' }}>
        <div className="flex-1">
          <div className="font-mono text-[10.5px] uppercase" style={{ color: C.muted, letterSpacing: '0.18em' }}>Dashboard</div>
          <h1 className="font-serif text-[44px] leading-[1.05] mt-1" style={{ color: C.teal, letterSpacing: '-0.005em' }}>{weekLabel}</h1>
          <p className="mt-1.5 text-[13px]" style={{ color: 'rgba(0,78,100,0.7)' }}>
            All ingested meetings laid out week by week.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-10 pt-5 pb-4 flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[{fn: prevWeek, rot: '90deg'}, {fn: nextWeek, rot: '-90deg'}].map(({fn, rot}, i) => (
            <button key={i} onClick={fn}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.3)', color: C.teal }}>
              <Icon.Chevron width={14} height={14} style={{ transform: `rotate(${rot})` }}/>
            </button>
          ))}
          <button onClick={goToday} className="ml-1 px-3 h-8 rounded-full text-[12px] font-medium"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.3)', color: C.teal }}>
            Today
          </button>
        </div>
        <div className="flex items-center gap-1 ml-2 p-0.5 rounded-full"
             style={{ background: 'rgba(0,78,100,0.06)', border: '1px solid rgba(0,78,100,0.12)' }}>
          {(['Day', 'Week', 'Month', 'Agenda'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
                    className="px-3 py-1 rounded-full text-[12px] font-medium transition"
                    style={{
                      background: view === v ? '#FFFFFF' : 'transparent',
                      color: view === v ? C.teal : 'rgba(0,78,100,0.65)',
                      boxShadow: view === v ? '0 1px 2px rgba(0,78,100,0.08)' : 'none',
                    }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid + right rail */}
      <div className="px-10 pb-10 flex-1 overflow-hidden grid gap-6" style={{ gridTemplateColumns: '1fr 230px' }}>
        {/* Calendar grid */}
        <div className="rounded-2xl flex flex-col overflow-hidden"
             style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.28)' }}>
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(150,137,123,0.20)' }}>
            {weekDays.map((d, i) => {
              const iso = isoDate(d)
              const isToday = iso === todayIso
              return (
                <div key={i}
                     className="px-3 py-3 flex items-baseline gap-2"
                     style={{
                       borderRight: i < 6 ? '1px solid rgba(150,137,123,0.15)' : 'none',
                       background: isToday ? 'rgba(206,108,71,0.05)' : 'transparent',
                     }}>
                  <span className="font-mono text-[10px] uppercase" style={{ color: C.muted, letterSpacing: '0.12em' }}>{DAY_LABELS[i]}</span>
                  <span className="font-serif text-[20px] leading-none" style={{ color: isToday ? C.accent : C.teal }}>{d.getDate()}</span>
                  {isToday && <span className="text-[9.5px] font-mono uppercase" style={{ color: C.accent, letterSpacing: '0.1em' }}>today</span>}
                </div>
              )
            })}
          </div>

          {/* Meetings per day */}
          <div className="grid flex-1 overflow-y-auto nice-scroll" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((d, i) => {
              const iso = isoDate(d)
              const isToday = iso === todayIso
              const dayMeetings = meetingsByDay.get(iso) ?? []
              return (
                <div key={i}
                     className="p-2 flex flex-col gap-1.5 min-h-[200px]"
                     style={{
                       borderRight: i < 6 ? '1px solid rgba(150,137,123,0.10)' : 'none',
                       background: isToday ? 'rgba(206,108,71,0.025)' : 'transparent',
                     }}>
                  {dayMeetings.map(m => {
                    const color = topicColor(m.topics[0] ?? 'default')
                    const isSelected = m.id === selectedId
                    return (
                      <button
                        key={m.id}
                        onClick={() => onSelect(m.id)}
                        className="w-full text-left rounded-md px-2 py-1.5 transition hover:brightness-95 overflow-hidden"
                        style={{
                          background: m.has_contradiction ? 'rgba(107,39,55,0.09)' : `${color}16`,
                          borderLeft: `3px solid ${m.has_contradiction ? C.burgundy : color}`,
                          outline: isSelected ? `1px solid ${color}` : 'none',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {m.has_contradiction && <Icon.Alert width={10} height={10} style={{ color: C.burgundy, flexShrink: 0 }}/>}
                          <span className="text-[11px] font-semibold leading-tight truncate flex-1"
                                style={{ color: m.has_contradiction ? C.burgundy : C.teal }}>
                            {m.title}
                          </span>
                        </div>
                        <div className="text-[9.5px] font-mono mt-0.5 opacity-60"
                             style={{ color: m.has_contradiction ? C.burgundy : C.teal }}>
                          {m.decision_count}d · {m.attendees.length} ppl
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4 overflow-y-auto nice-scroll">
          {/* Mini month */}
          <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.28)' }}>
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-serif text-[18px]" style={{ color: C.teal }}>{fmtMonthYear(weekStart)}</div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: C.muted }}>
                <button className="px-1" onClick={prevWeek}>‹</button>
                <button className="px-1" onClick={nextWeek}>›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 mb-1">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="text-center font-mono text-[9.5px]" style={{ color: C.muted }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {monthGrid.map((d, i) => {
                if (d == null) return <div key={i}/>
                const thisDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), d)
                const iso = isoDate(thisDate)
                const isToday = iso === todayIso
                const inWeek = weekDays.some(w => isoDate(w) === iso)
                const hasMeeting = meetingsByDay.has(iso)
                return (
                  <div key={i} className="flex items-center justify-center">
                    <div className="relative flex flex-col items-center justify-center"
                         style={{
                           width: 24, height: 24, borderRadius: 999,
                           background: isToday ? C.accent : inWeek ? 'rgba(0,78,100,0.06)' : 'transparent',
                           color: isToday ? '#fff' : C.teal,
                         }}>
                      <span className="text-[11px]" style={{ fontWeight: isToday ? 600 : 400 }}>{d}</span>
                      {hasMeeting && !isToday && (
                        <span className="absolute -bottom-0.5 w-1 h-1 rounded-full" style={{ background: C.accent }}/>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Today's agenda */}
          <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.28)' }}>
            <div className="font-mono text-[10px] uppercase mb-3" style={{ color: C.muted, letterSpacing: '0.18em' }}>
              Today · {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {todayAgenda.length === 0 ? (
              <div className="text-[12px]" style={{ color: C.muted }}>No meetings today.</div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {todayAgenda.map(m => {
                  const color = m.has_contradiction ? C.burgundy : topicColor(m.topics[0] ?? 'default')
                  return (
                    <li key={m.id} onClick={() => onSelect(m.id)} className="flex gap-3 cursor-pointer">
                      <div className="w-[3px] rounded-full flex-shrink-0" style={{ background: color }}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold leading-tight flex items-center gap-1"
                             style={{ color: m.has_contradiction ? C.burgundy : C.teal }}>
                          {m.has_contradiction && <Icon.Alert width={10} height={10}/>}
                          <span className="truncate">{m.title}</span>
                        </div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: C.muted }}>
                          {m.decision_count} decisions · {m.attendees.length} attendees
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Indexer status */}
          <div className="rounded-2xl p-4" style={{ background: C.teal, color: '#EDFFEC' }}>
            <div className="font-mono text-[10px] uppercase mb-2" style={{ color: 'rgba(237,255,236,0.55)', letterSpacing: '0.18em' }}>
              Indexer status
            </div>
            <div className="text-[13px] leading-snug">
              <span style={{ color: '#EDFFEC' }}>{totalIndexed} meetings</span>{' '}
              <span style={{ color: 'rgba(237,255,236,0.6)' }}>indexed.</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10.5px]" style={{ color: 'rgba(237,255,236,0.55)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }}/>
              All transcripts ingested
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
