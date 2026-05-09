import { topicColor, topicBg } from '@/lib/colors'
import type { CalendarDecision } from '@/types/calendar'

interface Props {
  decisions: CalendarDecision[]
}

function groupByTopic(decisions: CalendarDecision[]): Map<string, CalendarDecision[]> {
  const map = new Map<string, CalendarDecision[]>()
  for (const d of decisions) {
    const group = map.get(d.topic) ?? []
    group.push(d)
    map.set(d.topic, group)
  }
  return map
}

export function DecisionsTab({ decisions }: Props) {
  if (decisions.length === 0) {
    return (
      <p className="text-[13px] py-6 text-center" style={{ color: '#96897B' }}>
        No decisions extracted for this meeting.
      </p>
    )
  }

  const groups = groupByTopic(decisions)

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([topic, items]) => (
        <div key={topic}>
          {/* Topic header */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: topicColor(topic) }}
            />
            <span
              className="font-mono text-[10.5px] uppercase"
              style={{ color: topicColor(topic), letterSpacing: '0.12em' }}
            >
              {topic}
            </span>
          </div>

          {/* Decisions in this topic */}
          <div className="flex flex-col gap-2 ml-4">
            {items.map((d, i) => (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{
                  background: topicBg(topic),
                  border: `1px solid ${topicColor(topic)}22`,
                }}
              >
                <p className="text-[13px] leading-snug" style={{ color: '#004E64' }}>
                  {d.decision}
                </p>
                {(d.owner || d.rationale) && (
                  <div className="mt-2 flex flex-col gap-1">
                    {d.owner && (
                      <span className="text-[11px] font-mono" style={{ color: '#96897B' }}>
                        Owner: {d.owner}
                      </span>
                    )}
                    {d.rationale && (
                      <p className="text-[11.5px] leading-snug italic" style={{ color: 'rgba(0,78,100,0.60)' }}>
                        {d.rationale}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
