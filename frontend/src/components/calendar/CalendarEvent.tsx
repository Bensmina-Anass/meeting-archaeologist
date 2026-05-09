'use client'

import { topicColor } from '@/lib/colors'
import type { CalendarMeeting } from '@/types/calendar'

interface Props {
  meeting: CalendarMeeting
  isSelected: boolean
  isDimmed: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function CalendarEvent({ meeting, isSelected, isDimmed, onClick, onMouseEnter, onMouseLeave }: Props) {
  const primaryTopic = meeting.topics[0] ?? 'default'
  const borderColor = topicColor(primaryTopic)

  return (
    <button
      data-meeting-id={meeting.id}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={meeting.title}
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: isSelected ? 'rgba(0,78,100,0.06)' : 'rgba(255,255,255,0.85)',
        opacity: isDimmed ? 0.28 : 1,
        outline: isSelected ? `1px solid rgba(0,78,100,0.20)` : 'none',
        cursor: isDimmed ? 'default' : 'pointer',
        pointerEvents: isDimmed ? 'none' : 'auto',
        transition: 'opacity 160ms, background 120ms',
      }}
      className="w-full flex items-center gap-1 px-1.5 py-[3px] rounded-r text-left"
    >
      {/* Title */}
      <span
        className="flex-1 min-w-0 text-[11px] font-medium leading-tight truncate"
        style={{ color: 'var(--color-teal, #004E64)' }}
      >
        {meeting.title}
      </span>
      {/* Contradiction dot */}
      {meeting.has_contradiction && (
        <span
          className="flex-shrink-0 w-[5px] h-[5px] rounded-full"
          style={{ background: '#6B2737' }}
          title="Has contradiction"
        />
      )}
    </button>
  )
}
