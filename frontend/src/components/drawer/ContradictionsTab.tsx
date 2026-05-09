import { topicColor, topicBg } from '@/lib/colors'
import type { CalendarContradiction, CalendarMeeting } from '@/types/calendar'

interface Props {
  contradictions: CalendarContradiction[]
  allMeetings: CalendarMeeting[]
  onMeetingClick: (id: string) => void
}

export function ContradictionsTab({ contradictions, allMeetings, onMeetingClick }: Props) {
  if (contradictions.length === 0) {
    return (
      <p className="text-[13px] py-6 text-center" style={{ color: '#96897B' }}>
        No contradictions detected for this meeting.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {contradictions.map((c, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(107,39,55,0.18)' }}
        >
          {/* This decision */}
          <div className="px-3 py-2.5" style={{ background: 'rgba(107,39,55,0.05)' }}>
            <p className="text-[11px] font-mono uppercase mb-1" style={{ color: 'rgba(107,39,55,0.55)', letterSpacing: '0.1em' }}>
              This meeting
            </p>
            <p className="text-[13px] leading-snug" style={{ color: '#004E64' }}>
              {c.decision}
            </p>
          </div>

          {/* VS divider */}
          <div
            className="flex items-center gap-2 px-3 py-1"
            style={{ borderTop: '1px solid rgba(107,39,55,0.12)', borderBottom: '1px solid rgba(107,39,55,0.12)', background: 'rgba(107,39,55,0.03)' }}
          >
            <span className="w-full h-px" style={{ background: 'rgba(107,39,55,0.15)' }} />
            <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'rgba(107,39,55,0.45)' }}>
              VS
            </span>
            <span className="w-full h-px" style={{ background: 'rgba(107,39,55,0.15)' }} />
          </div>

          {/* Conflicting decision */}
          <div className="px-3 py-2.5" style={{ background: 'rgba(107,39,55,0.03)' }}>
            <button
              onClick={() => onMeetingClick(c.conflicting_meeting_id)}
              className="text-[11px] font-mono uppercase mb-1 hover:underline text-left"
              style={{ color: 'rgba(107,39,55,0.55)', letterSpacing: '0.1em' }}
            >
              {c.conflicting_meeting_date} · {c.conflicting_meeting_title} ↗
            </button>
            <p className="text-[13px] leading-snug" style={{ color: '#004E64' }}>
              {c.conflicting_decision}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
