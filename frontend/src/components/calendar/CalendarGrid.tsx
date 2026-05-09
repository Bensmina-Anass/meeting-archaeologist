'use client'

import { useRef, RefObject } from 'react'
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, format, isSameMonth, isToday, isSameDay,
} from 'date-fns'
import { CalendarEvent } from './CalendarEvent'
import { ContradictionLines } from './ContradictionLines'
import type { CalendarMeeting } from '@/types/calendar'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE_EVENTS = 3

interface Props {
  year: number
  month: number // 1-based
  meetings: CalendarMeeting[]
  selectedMeetingId: string | null
  topicFilter: string[]
  contradictionOnly: boolean
  hoveredMeetingId: string | null
  onMeetingClick: (id: string) => void
  onMeetingHover: (id: string | null) => void
  containerRef: RefObject<HTMLDivElement | null>
}

function getWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1)
  const last = endOfMonth(first)
  const start = startOfWeek(first, { weekStartsOn: 1 })
  const end = endOfWeek(last, { weekStartsOn: 1 })
  const weeks: Date[][] = []
  let cur = start
  while (cur <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cur)
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  }
  return weeks
}

function meetingsForDay(meetings: CalendarMeeting[], day: Date): CalendarMeeting[] {
  const iso = format(day, 'yyyy-MM-dd')
  return meetings.filter((m) => m.date === iso)
}

export function CalendarGrid({
  year, month, meetings, selectedMeetingId, topicFilter,
  contradictionOnly, hoveredMeetingId, onMeetingClick, onMeetingHover, containerRef,
}: Props) {
  const weeks = getWeeks(year, month)
  const currentMonth = new Date(year, month - 1, 1)

  function isDimmed(m: CalendarMeeting): boolean {
    if (contradictionOnly && !m.has_contradiction) return true
    if (topicFilter.length > 0 && !m.topics.some((t) => topicFilter.includes(t))) return true
    return false
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col"
      style={{ height: '100%', userSelect: 'none' }}
    >
      <ContradictionLines
        containerRef={containerRef}
        hoveredMeetingId={hoveredMeetingId}
        meetings={meetings}
      />

      {/* Day-of-week header */}
      <div
        className="grid grid-cols-7 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,78,100,0.10)' }}
      >
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className="py-2 text-center font-mono text-[10.5px] uppercase"
            style={{
              color: i >= 5 ? 'rgba(150,137,123,0.70)' : 'rgba(0,78,100,0.50)',
              letterSpacing: '0.12em',
              borderRight: i < 6 ? '1px solid rgba(0,78,100,0.06)' : 'none',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div
        className="grid flex-1"
        style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
      >
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7"
            style={{ borderBottom: wi < weeks.length - 1 ? '1px solid rgba(0,78,100,0.08)' : 'none' }}
          >
            {week.map((day, di) => {
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const dayMeetings = meetingsForDay(meetings, day)
              const overflow = dayMeetings.length - MAX_VISIBLE_EVENTS

              return (
                <div
                  key={di}
                  className="flex flex-col min-h-0 p-1"
                  style={{
                    borderRight: di < 6 ? '1px solid rgba(0,78,100,0.06)' : 'none',
                    background: today ? 'rgba(0,78,100,0.03)' : 'transparent',
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-end mb-1 flex-shrink-0">
                    <span
                      className="font-mono text-[11px] w-5 h-5 flex items-center justify-center rounded-full"
                      style={{
                        color: !inMonth
                          ? 'rgba(150,137,123,0.35)'
                          : today
                          ? '#EDFFEC'
                          : 'rgba(0,78,100,0.55)',
                        background: today ? '#004E64' : 'transparent',
                        fontWeight: today ? 600 : 400,
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-[2px] flex-1 overflow-hidden">
                    {dayMeetings.slice(0, MAX_VISIBLE_EVENTS).map((m) => (
                      <CalendarEvent
                        key={m.id}
                        meeting={m}
                        isSelected={m.id === selectedMeetingId}
                        isDimmed={isDimmed(m)}
                        onClick={() => onMeetingClick(m.id)}
                        onMouseEnter={() => onMeetingHover(m.id)}
                        onMouseLeave={() => onMeetingHover(null)}
                      />
                    ))}
                    {overflow > 0 && (
                      <span
                        className="text-[10px] font-mono pl-1"
                        style={{ color: 'rgba(150,137,123,0.70)' }}
                      >
                        +{overflow} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
