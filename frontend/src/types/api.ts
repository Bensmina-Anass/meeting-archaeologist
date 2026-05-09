export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface DecisionOut {
  id: string
  meeting_id: string
  topic_id: string | null
  summary: string
  verbatim_quote: string
  confidence: 'explicit' | 'implied' | 'tentative'
  participants: string[]
  decided_at: string | null
  created_at: string
}

export interface MeetingSummary {
  id: string
  title: string
  source: string
  started_at: string | null
  ended_at: string | null
  attendees: string[]
  decision_count: number
  ingested_at: string
}

export interface MeetingDetail extends Omit<MeetingSummary, 'decision_count'> {
  decisions: DecisionOut[]
}

export interface TopicSummary {
  id: string
  slug: string
  display_name: string
  decision_count: number
  created_at: string
}

export interface TopicDetail {
  id: string
  slug: string
  display_name: string
  created_at: string
  decisions: DecisionOut[]
}

export interface ContradictionOut {
  id: string
  topic_id: string
  decision_a_id: string
  decision_b_id: string
  explanation: string
  severity: 'low' | 'medium' | 'high'
  detected_at: string
  dismissed: boolean
}

/** Enriched contradiction — decision texts resolved from topic decisions */
export interface EnrichedContradiction extends ContradictionOut {
  topic_slug: string
  topic_display_name: string
  decision_a: DecisionOut
  decision_b: DecisionOut
}
