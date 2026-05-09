import { Sidebar } from '@/components/Sidebar'
import { listContradictions } from '@/lib/api'

export default async function SidebarLayout({ children }: { children: React.ReactNode }) {
  let contradictionCount = 0
  try {
    const contradictions = await listContradictions(false)
    contradictionCount = contradictions.length
  } catch {
    // backend may be down
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar contradictionCount={contradictionCount} />
      <main
        className="nice-scroll paper-grain"
        style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#EDFFEC' }}
      >
        {children}
      </main>
    </div>
  )
}
