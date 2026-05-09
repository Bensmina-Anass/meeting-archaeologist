import Link from 'next/link'
import { listMeetings } from '@/lib/api'
import { Card, EmptyState, ErrorBanner, Eyebrow, SectionHeader } from '@/components/ui'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function MeetingsPage() {
  let meetings: Awaited<ReturnType<typeof listMeetings>>['items'] | null = null
  let error: string | null = null

  try {
    const page = await listMeetings()
    meetings = page.items
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load meetings'
  }

  return (
    <div className="px-10 py-10 anim-fadeup">
      {/* Header */}
      <Eyebrow>Archive</Eyebrow>
      <SectionHeader>Meetings</SectionHeader>
      <p className="mt-2 text-[13.5px] max-w-[520px]" style={{ color: 'rgba(0,78,100,0.70)' }}>
        Every ingested meeting and the decisions catalogued within it.
      </p>

      <div className="mt-8">
        {error && <ErrorBanner message={error} />}

        {!error && meetings?.length === 0 && (
          <EmptyState label="No meetings yet" />
        )}

        {!error && meetings && meetings.length > 0 && (
          <div className="flex flex-col gap-3">
            {meetings.map((m) => (
              <Link key={m.id} href={`/meetings/${m.id}`} className="no-underline block">
                <Card className="p-5 transition-shadow hover:shadow-md cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-mono text-[10px] uppercase"
                          style={{ color: '#96897B', letterSpacing: '0.14em' }}
                        >
                          {m.source}
                        </span>
                        <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: '#96897B', letterSpacing: '0.04em' }}
                        >
                          {fmtDate(m.started_at ?? m.ingested_at)}
                        </span>
                      </div>
                      <h3
                        className="font-serif text-[22px] leading-tight"
                        style={{ color: '#004E64', letterSpacing: '-0.005em' }}
                      >
                        {m.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-5 flex-shrink-0 mt-1">
                      {/* Attendees */}
                      <div className="text-center">
                        <div
                          className="font-mono text-[18px] font-medium"
                          style={{ color: '#004E64' }}
                        >
                          {m.attendees.length}
                        </div>
                        <div
                          className="font-mono text-[9.5px] uppercase"
                          style={{ color: '#96897B', letterSpacing: '0.12em' }}
                        >
                          {m.attendees.length === 1 ? 'attendee' : 'attendees'}
                        </div>
                      </div>
                      {/* Decisions */}
                      <div className="text-center">
                        <div
                          className="font-mono text-[18px] font-medium"
                          style={{ color: '#004E64' }}
                        >
                          {m.decision_count}
                        </div>
                        <div
                          className="font-mono text-[9.5px] uppercase"
                          style={{ color: '#96897B', letterSpacing: '0.12em' }}
                        >
                          {m.decision_count === 1 ? 'decision' : 'decisions'}
                        </div>
                      </div>
                      {/* Arrow */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="#96897B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </div>
                  </div>

                  {m.attendees.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.attendees.slice(0, 6).map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                          style={{
                            background: 'rgba(0,78,100,0.06)',
                            color: '#004E64',
                            border: '1px solid rgba(0,78,100,0.12)',
                          }}
                        >
                          {a}
                        </span>
                      ))}
                      {m.attendees.length > 6 && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]"
                          style={{ color: '#96897B' }}
                        >
                          +{m.attendees.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
