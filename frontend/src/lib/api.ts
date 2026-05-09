import type {
  ContradictionOut,
  DecisionOut,
  EnrichedContradiction,
  MeetingDetail,
  MeetingSummary,
  Page,
  TopicDetail,
  TopicSummary,
} from '@/types/api'
import type { CalendarMeeting, CalendarMeetingDetail } from '@/types/calendar'
import { getMockMeetings, getMockMeetingDetail, ALL_MOCK_TOPICS } from './mock'

const BASE =
  typeof window === 'undefined'
    ? (process.env.API_URL ?? 'http://localhost:8000')
    : '/api'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// ── Calendar API ──────────────────────────────────────────────────────────────

export async function fetchCalendarMeetings(from: string, to: string): Promise<CalendarMeeting[]> {
  if (USE_MOCK) return getMockMeetings(from, to)
  const res = await fetch(`${BASE}/calendar/meetings?from=${from}&to=${to}`, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function fetchMeetingDetail(id: string): Promise<CalendarMeetingDetail> {
  if (USE_MOCK) {
    const d = getMockMeetingDetail(id)
    if (!d) throw new Error(`Meeting ${id} not found in mock data`)
    return d
  }
  const res = await fetch(`${BASE}/calendar/meetings/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function fetchAllTopics(): Promise<string[]> {
  if (USE_MOCK) return ALL_MOCK_TOPICS
  const res = await fetch(`${BASE}/topics`, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const topics: { slug: string }[] = await res.json()
  return topics.map((t) => t.slug)
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: 30 },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`)
  }
  return res.json() as Promise<T>
}

export async function listMeetings(
  page = 1,
  pageSize = 50,
): Promise<Page<MeetingSummary>> {
  return apiFetch(`/meetings?page=${page}&page_size=${pageSize}`)
}

export async function getMeeting(id: string): Promise<MeetingDetail> {
  return apiFetch(`/meetings/${id}`)
}

export async function listTopics(): Promise<TopicSummary[]> {
  return apiFetch('/topics')
}

export async function getTopic(id: string): Promise<TopicDetail> {
  return apiFetch(`/topics/${id}`)
}

export async function listTopicDecisions(topicId: string): Promise<DecisionOut[]> {
  return apiFetch(`/topics/${topicId}/decisions`)
}

export async function listContradictions(
  dismissed = false,
  topicId?: string,
): Promise<ContradictionOut[]> {
  const params = new URLSearchParams({ dismissed: String(dismissed) })
  if (topicId) params.set('topic_id', topicId)
  return apiFetch(`/contradictions?${params}`)
}

export async function dismissContradiction(id: string): Promise<ContradictionOut> {
  return apiFetch(`/contradictions/${id}/dismiss`, {
    method: 'POST',
    cache: 'no-store',
  })
}

export function streamChat(
  meetingId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<Response> {
  return fetch(`${BASE}/meetings/${meetingId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
}

/**
 * Fetch contradictions and enrich each with topic + decision text.
 * Groups fetches by topic_id to avoid redundant calls.
 */
export async function listEnrichedContradictions(
  dismissed = false,
): Promise<EnrichedContradiction[]> {
  const contradictions = await listContradictions(dismissed)
  if (contradictions.length === 0) return []

  const topicIds = [...new Set(contradictions.map((c) => c.topic_id))]
  const topicDetails = await Promise.all(topicIds.map((id) => getTopic(id)))

  const topicMap = new Map(topicDetails.map((t) => [t.id, t]))
  const decisionMap = new Map(
    topicDetails.flatMap((t) => t.decisions.map((d) => [d.id, d])),
  )

  return contradictions.flatMap((c) => {
    const topic = topicMap.get(c.topic_id)
    const decA = decisionMap.get(c.decision_a_id)
    const decB = decisionMap.get(c.decision_b_id)
    if (!topic || !decA || !decB) return []
    return [
      {
        ...c,
        topic_slug: topic.slug,
        topic_display_name: topic.display_name,
        decision_a: decA,
        decision_b: decB,
      },
    ]
  })
}
