import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTopic, listContradictions } from '@/lib/api'
import { ErrorBanner, Eyebrow, Pill, ConfidencePill } from '@/components/ui'
import type { ContradictionOut, DecisionOut } from '@/types/api'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isContradicted(
  d: DecisionOut,
  contradictions: ContradictionOut[],
): boolean {
  return contradictions.some(
    (c) => c.decision_a_id === d.id || c.decision_b_id === d.id,
  )
}

export default async function TopicDetailPage({
  params,
}: {
  params: { id: string }
}) {
  let topic
  let contradictions: ContradictionOut[] = []
  let error: string | null = null

  try {
    topic = await getTopic(params.id)
    contradictions = await listContradictions(false, params.id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith('404')) notFound()
    error = msg || 'Failed to load topic'
  }

  if (error) {
    return (
      <div className="px-10 py-10">
        <ErrorBanner message={error} />
      </div>
    )
  }
  if (!topic) return null

  const decisions = [...topic.decisions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  // Set of decision IDs that appear in contradictions
  const contradictedIds = new Set(
    contradictions.flatMap((c) => [c.decision_a_id, c.decision_b_id]),
  )

  return (
    <div className="px-10 py-10 anim-fadeup">
      {/* Back */}
      <Link
        href="/topics"
        className="no-underline inline-flex items-center gap-1.5 text-[12.5px] font-medium mb-6"
        style={{ color: '#96897B' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
          <path d="m15 18-6-6 6-6"/>
        </svg>
        All topics
      </Link>

      <Eyebrow>{topic.slug}</Eyebrow>
      <h1
        className="font-serif mt-1 mb-2"
        style={{ fontSize: 36, color: '#004E64', letterSpacing: '-0.005em', lineHeight: 1.1 }}
      >
        {topic.display_name}
      </h1>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-[13px]" style={{ color: '#96897B' }}>
          {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}
        </span>
        {contradictions.length > 0 && (
          <Pill tone="burg">
            {contradictions.length} contradiction{contradictions.length > 1 ? 's' : ''}
          </Pill>
        )}
      </div>

      {decisions.length === 0 ? (
        <p className="text-[13px]" style={{ color: '#96897B' }}>
          No decisions on this topic yet.
        </p>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute top-3 bottom-3 w-[2px]"
            style={{ left: 11, background: 'rgba(0,78,100,0.15)' }}
          />

          <div className="flex flex-col gap-0">
            {decisions.map((d, i) => {
              const flagged = contradictedIds.has(d.id)
              const isLast = i === decisions.length - 1

              // Check if there's a contradiction between this decision and the next
              const nextDecision = decisions[i + 1]
              const transitionContradicted =
                nextDecision &&
                contradictedIds.has(d.id) &&
                contradictedIds.has(nextDecision.id) &&
                contradictions.some(
                  (c) =>
                    (c.decision_a_id === d.id && c.decision_b_id === nextDecision.id) ||
                    (c.decision_b_id === d.id && c.decision_a_id === nextDecision.id),
                )

              return (
                <div key={d.id} className="relative flex gap-5">
                  {/* Dot column */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 24 }}>
                    {/* Dot */}
                    <div
                      className="relative z-10 rounded-full flex-shrink-0 mt-3"
                      style={{
                        width: 14,
                        height: 14,
                        background: flagged ? '#6B2737' : '#FFFFFF',
                        border: `2px solid ${flagged ? '#6B2737' : '#004E64'}`,
                        boxShadow: flagged ? '0 0 0 3px rgba(107,39,55,0.15)' : 'none',
                        marginLeft: 4,
                      }}
                    />
                    {/* Line segment below dot */}
                    {!isLast && (
                      <div
                        className="flex-1 w-[2px] my-1"
                        style={{
                          background: transitionContradicted
                            ? '#6B2737'
                            : 'rgba(0,78,100,0.15)',
                          minHeight: 24,
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className="flex-1 min-w-0 mb-5 rounded-xl p-4"
                    style={{
                      background: flagged
                        ? 'rgba(107,39,55,0.04)'
                        : '#FFFFFF',
                      border: flagged
                        ? '1px solid rgba(107,39,55,0.25)'
                        : '1px solid rgba(150,137,123,0.25)',
                    }}
                  >
                    {/* Meeting + date */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Link
                        href={`/meetings/${d.meeting_id}`}
                        className="no-underline font-mono text-[10.5px] font-medium"
                        style={{ color: '#004E64', letterSpacing: '0.04em' }}
                      >
                        {d.meeting_id}
                      </Link>
                      <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: '#96897B', letterSpacing: '0.04em' }}
                      >
                        {fmtDate(d.decided_at ?? d.created_at)}
                      </span>
                      {flagged && (
                        <>
                          <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
                          <Pill tone="burg">contradicted</Pill>
                        </>
                      )}
                    </div>

                    <p className="text-[13.5px] leading-snug" style={{ color: '#004E64' }}>
                      {d.summary}
                    </p>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <ConfidencePill confidence={d.confidence} />
                      {d.participants.length > 0 && (
                        <span className="text-[11px]" style={{ color: '#96897B' }}>
                          {d.participants.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contradictions detail */}
      {contradictions.length > 0 && (
        <div className="mt-4">
          <Eyebrow>Contradictions on this topic</Eyebrow>
          <p className="mt-2 text-[12.5px]" style={{ color: '#96897B' }}>
            See the{' '}
            <Link href="/contradictions" className="no-underline font-medium" style={{ color: '#CE6C47' }}>
              Contradictions page
            </Link>{' '}
            for full detail and dismiss controls.
          </p>
        </div>
      )}
    </div>
  )
}
