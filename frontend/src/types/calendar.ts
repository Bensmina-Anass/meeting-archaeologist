export interface CalendarMeeting {
  id: string
  date: string // YYYY-MM-DD
  title: string
  attendees: string[]
  topics: string[]
  decision_count: number
  has_contradiction: boolean
  contradicts_meeting_ids: string[]
}

export interface CalendarDecision {
  topic: string
  decision: string
  owner: string | null
  rationale: string | null
}

export interface CalendarContradiction {
  decision: string
  conflicting_decision: string
  conflicting_meeting_id: string
  conflicting_meeting_date: string
  conflicting_meeting_title: string
}

export interface CalendarMeetingDetail extends CalendarMeeting {
  decisions: CalendarDecision[]
  contradictions: CalendarContradiction[]
  transcript: string
}
