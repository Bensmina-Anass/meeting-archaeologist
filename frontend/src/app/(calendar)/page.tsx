import { fetchCalendarMeetings } from '@/lib/api'
import { DashboardApp } from '@/components/dashboard/DashboardApp'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const meetings = await fetchCalendarMeetings('2025-01-01', '2026-12-31').catch(() => [])
  return <DashboardApp initialMeetings={meetings}/>
}
