'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { TopBar } from './TopBar'
import { CalendarGrid } from './CalendarGrid'
import { MeetingDrawer } from '@/components/drawer/MeetingDrawer'
import { fetchCalendarMeetings, fetchAllTopics } from '@/lib/api'
import type { CalendarMeeting } from '@/types/calendar'

function todayYM() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

interface Props {
  initialMeetings: CalendarMeeting[]
  initialTopics: string[]
  initialYear: number
  initialMonth: number
}

export function CalendarDashboard({ initialMeetings, initialTopics, initialYear, initialMonth }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [meetings, setMeetings] = useState<CalendarMeeting[]>(initialMeetings)
  const [allTopics, setAllTopics] = useState<string[]>(initialTopics)
  const [loadingMonth, setLoadingMonth] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('meeting'))
  const [topicFilter, setTopicFilter] = useState<string[]>([])
  const [contradictionOnly, setContradictionOnly] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Sync URL param when selected meeting changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedId) {
      params.set('meeting', selectedId)
    } else {
      params.delete('meeting')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load meetings when month changes
  useEffect(() => {
    const from = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd')
    const to = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd')
    setLoadingMonth(true)
    fetchCalendarMeetings(from, to)
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoadingMonth(false))
  }, [year, month])

  function navigate(delta: number) {
    setMonth((m) => {
      const next = m + delta
      if (next < 1) { setYear((y) => y - 1); return 12 }
      if (next > 12) { setYear((y) => y + 1); return 1 }
      return next
    })
  }

  function goToday() {
    const { year: y, month: m } = todayYM()
    setYear(y)
    setMonth(m)
  }

  const handleMeetingClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleClose = useCallback(() => setSelectedId(null), [])

  return (
    <div className="relative flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
      <TopBar
        year={year}
        month={month}
        allTopics={allTopics}
        topicFilter={topicFilter}
        contradictionOnly={contradictionOnly}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToday}
        onTopicFilterChange={setTopicFilter}
        onContradictionToggle={setContradictionOnly}
      />

      <div className="relative flex-1 min-h-0" style={{ opacity: loadingMonth ? 0.5 : 1, transition: 'opacity 200ms' }}>
        <CalendarGrid
          year={year}
          month={month}
          meetings={meetings}
          selectedMeetingId={selectedId}
          topicFilter={topicFilter}
          contradictionOnly={contradictionOnly}
          hoveredMeetingId={hoveredId}
          onMeetingClick={handleMeetingClick}
          onMeetingHover={setHoveredId}
          containerRef={containerRef}
        />

        <MeetingDrawer
          meetingId={selectedId}
          allMeetings={meetings}
          onClose={handleClose}
          onMeetingClick={handleMeetingClick}
        />
      </div>
    </div>
  )
}
