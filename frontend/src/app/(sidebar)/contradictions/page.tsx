import { listEnrichedContradictions } from '@/lib/api'
import { ErrorBanner, Eyebrow, SectionHeader } from '@/components/ui'
import { ContradictionsList } from './ContradictionsList'

export default async function ContradictionsPage() {
  let contradictions
  let error: string | null = null

  try {
    contradictions = await listEnrichedContradictions(false)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load contradictions'
  }

  return (
    <div className="px-10 py-10 anim-fadeup">
      <Eyebrow>Conflict registry</Eyebrow>
      <SectionHeader>Contradictions</SectionHeader>
      <p className="mt-2 text-[13.5px] max-w-[560px]" style={{ color: 'rgba(0,78,100,0.70)' }}>
        Decisions that conflict with earlier rulings on the same topic.
        Burgundy markers indicate decisions that reverse a prior commitment.
      </p>

      <div className="mt-8">
        {error && <ErrorBanner message={error} />}

        {!error && contradictions !== undefined && (
          <ContradictionsList
            initialContradictions={contradictions}
            showDismissed={false}
          />
        )}
      </div>
    </div>
  )
}
