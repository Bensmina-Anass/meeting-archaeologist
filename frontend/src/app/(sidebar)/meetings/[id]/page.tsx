import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMeeting, listTopics, listTopicDecisions, listContradictions } from '@/lib/api'
import {
  Card,
  ConfidencePill,
  ErrorBanner,
  Eyebrow,
  Pill,
} from '@/components/ui'
import type { ContradictionOut, DecisionOut, TopicSummary } from '@/types/api'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface DecisionCardProps {
  decision: DecisionOut
  topicMap: Map<string, TopicSummary>
  contradictions: ContradictionOut[]
  allDecisions: Map<string, DecisionOut>
}

function DecisionCard({ decision, topicMap, contradictions, allDecisions }: DecisionCardProps) {
  const topic = decision.topic_id ? topicMap.get(decision.topic_id) : null

  // Find contradictions involving this decision
  const involvedIn = contradictions.filter(
    (c) =>
      c.decision_a_id === decision.id || c.decision_b_id === decision.id,
  )

  return (
    <Card
      flagged={involvedIn.length > 0}
      className="p-4"
    >
      {/* Topic eyebrow */}
      {topic && (
        <div className="mb-2">
          <span
            className="font-mono text-[10px] uppercase"
            style={{ color: '#96897B', letterSpacing: '0.14em' }}
          >
            {topic.slug}
          </span>
        </div>
      )}

      <p className="text-[13.5px] leading-snug" style={{ color: '#004E64' }}>
        {decision.summary}
      </p>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <ConfidencePill confidence={decision.confidence} />

        {decision.participants.length > 0 && (
          <span className="text-[11px]" style={{ color: '#96897B' }}>
            {decision.participants.slice(0, 3).join(', ')}
            {decision.participants.length > 3 && ` +${decision.participants.length - 3}`}
          </span>
        )}
      </div>

      {involvedIn.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {involvedIn.map((c) => {
            const otherId =
              c.decision_a_id === decision.id ? c.decision_b_id : c.decision_a_id
            const other = allDecisions.get(otherId)
            return (
              <Link key={c.id} href="/contradictions" className="no-underline">
                <Pill tone="burg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={9} height={9}>
                    <path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.4 14.18A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.7-2.96L10.3 3.86z"/>
                    <path d="M12 9v4"/><path d="M12 17h.01"/>
                  </svg>
                  Contradicts {other ? other.meeting_id : 'earlier decision'}
                </Pill>
              </Link>
            )
          })}
        </div>
      )}

      {decision.verbatim_quote && (
        <blockquote
          className="mt-3 pl-3 text-[12px] leading-relaxed italic"
          style={{
            borderLeft: '2px solid rgba(0,78,100,0.15)',
            color: 'rgba(0,78,100,0.65)',
          }}
        >
          "{decision.verbatim_quote}"
        </blockquote>
      )}
    </Card>
  )
}

export default async function MeetingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  let meeting
  let error: string | null = null

  try {
    meeting = await getMeeting(params.id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith('404')) notFound()
    error = msg || 'Failed to load meeting'
  }

  if (error) {
    return (
      <div className="px-10 py-10">
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (!meeting) return null

  // Enrich: topics + contradictions
  const topicIds = [
    ...new Set(meeting.decisions.map((d) => d.topic_id).filter(Boolean) as string[]),
  ]

  const [topics, ...topicDecisionSets] = await Promise.all([
    listTopics(),
    ...topicIds.map((id) => listTopicDecisions(id)),
  ])

  const topicMap = new Map(topics.map((t) => [t.id, t]))

  // All decisions across relevant topics (for resolving contradiction links)
  const allDecisions = new Map<string, DecisionOut>(
    topicDecisionSets.flat().map((d) => [d.id, d]),
  )

  // Contradictions for topics in this meeting
  const contradictions = (
    await Promise.all(
      topicIds.map((id) => listContradictions(false, id).catch(() => [])),
    )
  ).flat()

  // Group meeting decisions by topic_id
  const grouped = new Map<string | null, DecisionOut[]>()
  for (const d of meeting.decisions) {
    const key = d.topic_id ?? null
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(d)
  }

  return (
    <div className="px-10 py-10 anim-fadeup">
      {/* Back */}
      <Link
        href="/meetings"
        className="no-underline inline-flex items-center gap-1.5 text-[12.5px] font-medium mb-6"
        style={{ color: '#96897B' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
          <path d="m15 18-6-6 6-6"/>
        </svg>
        All meetings
      </Link>

      {/* Header */}
      <Eyebrow>{meeting.source}</Eyebrow>
      <h1
        className="font-serif mt-1"
        style={{ fontSize: 36, color: '#004E64', letterSpacing: '-0.005em', lineHeight: 1.1 }}
      >
        {meeting.title}
      </h1>

      {/* Meta row */}
      <div
        className="mt-3 flex items-center gap-4 flex-wrap text-[12.5px]"
        style={{ color: '#96897B' }}
      >
        <span className="font-mono" style={{ letterSpacing: '0.04em' }}>
          {fmtDate(meeting.started_at ?? meeting.ingested_at)}
        </span>
        {meeting.attendees.length > 0 && (
          <>
            <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
            <span>{meeting.attendees.join(', ')}</span>
          </>
        )}
        <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
        <span>{meeting.decisions.length} decisions</span>
        {contradictions.length > 0 && (
          <>
            <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
            <Pill tone="burg">
              {contradictions.length} contradiction{contradictions.length > 1 ? 's' : ''}
            </Pill>
          </>
        )}
      </div>

      {/* Decisions */}
      <div className="mt-8">
        <Eyebrow>Decisions · {meeting.decisions.length}</Eyebrow>

        {meeting.decisions.length === 0 ? (
          <p className="mt-4 text-[13px]" style={{ color: '#96897B' }}>
            No decisions logged for this meeting.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {Array.from(grouped.entries()).map(([topicId, decisions]) => {
              const topic = topicId ? topicMap.get(topicId) : null
              return (
                <div key={topicId ?? 'no-topic'}>
                  {topic && (
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="font-mono text-[10px] uppercase"
                        style={{ color: '#96897B', letterSpacing: '0.16em' }}
                      >
                        {topic.display_name}
                      </span>
                      <Link
                        href={`/topics/${topic.id}`}
                        className="no-underline text-[10px] font-mono"
                        style={{ color: '#CE6C47', letterSpacing: '0.04em' }}
                      >
                        → topic timeline
                      </Link>
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {decisions.map((d) => (
                      <DecisionCard
                        key={d.id}
                        decision={d}
                        topicMap={topicMap}
                        contradictions={contradictions}
                        allDecisions={allDecisions}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
