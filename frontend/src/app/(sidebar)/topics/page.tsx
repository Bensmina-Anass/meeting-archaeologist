import Link from 'next/link'
import { listTopics } from '@/lib/api'
import { Card, EmptyState, ErrorBanner, Eyebrow, SectionHeader } from '@/components/ui'

export default async function TopicsPage() {
  let topics: Awaited<ReturnType<typeof listTopics>> | null = null
  let error: string | null = null

  try {
    topics = await listTopics()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load topics'
  }

  return (
    <div className="px-10 py-10 anim-fadeup">
      <Eyebrow>Canonical subjects</Eyebrow>
      <SectionHeader>Topics</SectionHeader>
      <p className="mt-2 text-[13.5px] max-w-[520px]" style={{ color: 'rgba(0,78,100,0.70)' }}>
        Topics group decisions across meetings. Similarity is resolved automatically.
      </p>

      <div className="mt-8">
        {error && <ErrorBanner message={error} />}
        {!error && topics?.length === 0 && <EmptyState label="No topics yet" />}

        {!error && topics && topics.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Link key={t.id} href={`/topics/${t.id}`} className="no-underline block">
                <Card className="p-5 h-full cursor-pointer hover:shadow-md transition-shadow">
                  <div
                    className="font-mono text-[10px] uppercase mb-2"
                    style={{ color: '#96897B', letterSpacing: '0.14em' }}
                  >
                    {t.slug}
                  </div>
                  <div
                    className="font-serif text-[20px] leading-tight mb-3"
                    style={{ color: '#004E64' }}
                  >
                    {t.display_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="font-mono text-[13px] font-medium"
                      style={{ color: '#CE6C47' }}
                    >
                      {t.decision_count}
                    </span>
                    <span className="text-[12px]" style={{ color: '#96897B' }}>
                      {t.decision_count === 1 ? 'decision' : 'decisions'}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
