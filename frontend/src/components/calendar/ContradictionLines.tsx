'use client'

import { useEffect, useState, RefObject } from 'react'
import type { CalendarMeeting } from '@/types/calendar'

interface Line { x1: number; y1: number; x2: number; y2: number }

interface Props {
  containerRef: RefObject<HTMLDivElement | null>
  hoveredMeetingId: string | null
  meetings: CalendarMeeting[]
}

export function ContradictionLines({ containerRef, hoveredMeetingId, meetings }: Props) {
  const [lines, setLines] = useState<Line[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hoveredMeetingId || !containerRef.current) {
      setVisible(false)
      setTimeout(() => setLines([]), 200)
      return
    }

    const meeting = meetings.find((m) => m.id === hoveredMeetingId)
    if (!meeting || meeting.contradicts_meeting_ids.length === 0) {
      setVisible(false)
      setTimeout(() => setLines([]), 200)
      return
    }

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()

    const sourceEl = container.querySelector<HTMLElement>(`[data-meeting-id="${hoveredMeetingId}"]`)
    if (!sourceEl) return

    const sourceRect = sourceEl.getBoundingClientRect()
    const newLines: Line[] = []

    for (const targetId of meeting.contradicts_meeting_ids) {
      const targetEl = container.querySelector<HTMLElement>(`[data-meeting-id="${targetId}"]`)
      if (!targetEl) continue

      const targetRect = targetEl.getBoundingClientRect()

      // right-center of source → left-center of target (or reverse if target is left)
      const srcRight = sourceRect.right - containerRect.left
      const srcMid = sourceRect.top + sourceRect.height / 2 - containerRect.top
      const tgtLeft = targetRect.left - containerRect.left
      const tgtMid = targetRect.top + targetRect.height / 2 - containerRect.top

      newLines.push({ x1: srcRight, y1: srcMid, x2: tgtLeft, y2: tgtMid })
    }

    setLines(newLines)
    requestAnimationFrame(() => setVisible(true))
  }, [hoveredMeetingId, meetings, containerRef])

  if (lines.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        zIndex: 20,
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(107,39,55,0.55)" />
        </marker>
      </defs>
      {lines.map((l, i) => {
        const dx = l.x2 - l.x1
        const cpOffset = Math.min(Math.abs(dx) * 0.45, 120)
        const d = `M ${l.x1} ${l.y1} C ${l.x1 + cpOffset} ${l.y1}, ${l.x2 - cpOffset} ${l.y2}, ${l.x2} ${l.y2}`
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(107,39,55,0.55)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            markerEnd="url(#arrowhead)"
          />
        )
      })}
    </svg>
  )
}
