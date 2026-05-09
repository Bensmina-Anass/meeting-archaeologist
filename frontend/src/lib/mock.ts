import type { CalendarMeeting, CalendarMeetingDetail } from '@/types/calendar'

export const MOCK_MEETINGS: CalendarMeeting[] = [
  {
    id: 'meeting_01_auth_kickoff',
    date: '2025-09-02',
    title: 'Auth Kickoff',
    attendees: ['Sara', 'Marc', 'Léa'],
    topics: ['authentication_provider'],
    decision_count: 1,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_02_pricing',
    date: '2025-09-09',
    title: 'Pricing Model Review',
    attendees: ['Sara', 'Léa', 'David', 'Yann'],
    topics: ['pricing_model', 'metering_infrastructure'],
    decision_count: 2,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_03_database',
    date: '2025-09-16',
    title: 'Database & Infrastructure',
    attendees: ['Marc', 'David', 'Karim'],
    topics: ['database_platform', 'analytics_strategy'],
    decision_count: 2,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_04_hiring',
    date: '2025-09-23',
    title: 'Q4 Hiring Plan',
    attendees: ['Sara', 'Marc', 'Léa'],
    topics: ['q4_hiring_roles'],
    decision_count: 3,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_05_cloud_strategy',
    date: '2025-09-30',
    title: 'Cloud & Deployment Strategy',
    attendees: ['Sara', 'Marc', 'David', 'Karim'],
    topics: ['cloud_strategy', 'deployment_tooling'],
    decision_count: 2,
    has_contradiction: true,
    contradicts_meeting_ids: ['meeting_10_infra_2026'],
  },
  {
    id: 'meeting_06_roadmap',
    date: '2025-10-07',
    title: 'Q4 Product Roadmap',
    attendees: ['Sara', 'Léa', 'Marc', 'Yann'],
    topics: ['product_roadmap', 'feature_prioritization'],
    decision_count: 2,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_07_soc2',
    date: '2025-10-14',
    title: 'SOC 2 & Security Posture',
    attendees: ['Sara', 'Marc', 'David'],
    topics: ['soc2_compliance', 'access_control'],
    decision_count: 1,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_08_frontend',
    date: '2025-10-21',
    title: 'Frontend Stack Decision',
    attendees: ['Marc', 'David', 'Inès'],
    topics: ['frontend_stack', 'component_library'],
    decision_count: 2,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_09_oncall',
    date: '2025-10-28',
    title: 'On-Call & Observability',
    attendees: ['Marc', 'David', 'Karim'],
    topics: ['oncall_process', 'observability_stack'],
    decision_count: 2,
    has_contradiction: false,
    contradicts_meeting_ids: [],
  },
  {
    id: 'meeting_10_infra_2026',
    date: '2025-11-04',
    title: 'Infrastructure Planning for 2026',
    attendees: ['Marc', 'David', 'Karim', 'Inès'],
    topics: ['cloud_strategy', 'infra_budget'],
    decision_count: 1,
    has_contradiction: true,
    contradicts_meeting_ids: ['meeting_05_cloud_strategy'],
  },
]

const MOCK_DETAILS: Record<string, CalendarMeetingDetail> = {
  meeting_01_auth_kickoff: {
    ...MOCK_MEETINGS[0],
    decisions: [
      {
        topic: 'authentication_provider',
        decision: 'Adopt Auth0 as the authentication provider, rejecting in-house builds and Clerk.',
        owner: 'Marc',
        rationale: 'Auth0 covers SSO, MFA, and enterprise SAML out of the box. Building in-house would take 6–8 weeks and still lack feature parity.',
      },
    ],
    contradictions: [],
    transcript: `Meeting: Auth Kickoff
Date: 2025-09-02
Attendees: Sara (CEO), Marc (CTO), Léa (PM)

Sara: Alright, let's lock down the auth approach for the B2B platform. Marc, you've done the eval — walk us through it.

Marc: My recommendation is Auth0. Clerk is a strong second but the enterprise SAML story isn't mature yet. Building in-house is off the table — that's a six to eight week detour and we'd still be playing catch-up.

Léa: What about the enterprise customer requirements? I've had three prospects ask about SSO.

Marc: Auth0 handles SAML, OIDC, and social login out of the box. It's also got an audit trail, which the SOC2 conversation will need. I'm comfortable with it.

Sara: Good. Decision: we go with Auth0 for authentication. Marc owns the integration. Target is to have it live in staging by end of September.

Marc: Marc owns the integration.

Léa, can you make sure the enterprise customer requirements doc reflects what Auth0 gives us for free?

Léa: On it.`,
  },
  meeting_02_pricing: {
    ...MOCK_MEETINGS[1],
    decisions: [
      {
        topic: 'pricing_model',
        decision: 'Adopt per-seat pricing at launch with three tiers (Starter, Growth, Enterprise); usage-based pricing deferred to Q2.',
        owner: 'Sara',
        rationale: 'Per-seat is simpler to sell. Procurement understands it. Usage-based deferred to Q2 once we have real consumption data.',
      },
      {
        topic: 'metering_infrastructure',
        decision: 'Metering infrastructure work deprioritized; will not be built until Q2 usage-based pricing is formally committed.',
        owner: 'David',
        rationale: 'Three to four weeks of engineering work that should not be built speculatively.',
      },
    ],
    contradictions: [],
    transcript: `Meeting: Pricing Model Review
Date: 2025-09-09
Attendees: Sara (CEO), Léa (PM), David (Eng Lead), Yann (Sales)

Sara: We need to settle on the pricing model before the sales team starts the outbound push next week.

Yann: The market is split. Half our competitors do per-seat, half do usage-based. Our prospects keep asking which one we are.

Léa: Per-seat is simpler to sell. Procurement understands it. Usage-based has better expansion economics but the sales cycle gets longer.

David: From an engineering perspective, usage-based requires us to build metering infrastructure now. That's three to four weeks of work we haven't budgeted.

Sara: Let's go per-seat for launch. We hit the easier sales motion first, get to revenue faster, and we can layer usage-based as a second tier in Q2.

Léa: Tiers?

Sara: Three tiers. Starter, Growth, Enterprise. Decision: per-seat pricing for launch, three tiers, usage-based deferred to Q2.

David: I'll deprioritize the metering work then.

Sara: Yes. Don't build it until we commit to Q2 usage-based.`,
  },
  meeting_05_cloud_strategy: {
    ...MOCK_MEETINGS[4],
    decisions: [
      {
        topic: 'cloud_strategy',
        decision: 'Standardise on single-cloud AWS. No GCP, no Azure. All managed services from the AWS ecosystem.',
        owner: 'Marc',
        rationale: 'AWS ecosystem maturity, team familiarity, and reliability. Multi-cloud adds operational complexity without benefit at current scale.',
      },
      {
        topic: 'deployment_tooling',
        decision: 'Use ECS (not Kubernetes) for container orchestration for the next 12 months.',
        owner: 'David',
        rationale: 'ECS has lower operational overhead. Kubernetes migration can be revisited when the team exceeds 8 engineers.',
      },
    ],
    contradictions: [
      {
        decision: 'Standardise on single-cloud AWS. No GCP, no Azure.',
        conflicting_decision: 'Move to multi-cloud: AWS as primary, GCP as secondary for DR and ML workloads.',
        conflicting_meeting_id: 'meeting_10_infra_2026',
        conflicting_meeting_date: '2025-11-04',
        conflicting_meeting_title: 'Infrastructure Planning for 2026',
      },
    ],
    transcript: `Meeting: Cloud & Deployment Strategy
Date: 2025-09-30
Attendees: Sara (CEO), Marc (CTO), David (Eng Lead), Karim (Backend Eng)

Marc: I've done the cloud analysis. Three options: AWS-only, GCP-only, or multi-cloud from the start.

David: My vote is AWS. We know it, our CI/CD is already wired to it, and the managed service coverage is unmatched.

Karim: Agreed. EKS if we go Kubernetes, or ECS if we want lower ops overhead.

Marc: I'd say ECS for now. Kubernetes is overkill until we have more engineers to run it.

Sara: What's the cost delta?

Marc: Negligible at our scale. The difference is operational complexity, not money.

Sara: Decision: single-cloud AWS. No GCP, no Azure. ECS for containers, RDS for Postgres, S3 for storage. Marc owns the cloud architecture, David owns the deployment pipeline.

Marc: And on Kubernetes — we revisit when we're past eight engineers.

Sara: That's locked.`,
  },
  meeting_10_infra_2026: {
    ...MOCK_MEETINGS[9],
    decisions: [
      {
        topic: 'cloud_strategy',
        decision: 'Move to multi-cloud: AWS as primary, GCP as secondary for DR and ML workloads. Reverses the single-cloud AWS decision from September.',
        owner: 'Marc',
        rationale: 'GCP Vertex AI and BigQuery are significantly better for the analytics product line. DR requirements from enterprise customers also push toward geographic redundancy.',
      },
    ],
    contradictions: [
      {
        decision: 'Move to multi-cloud: AWS as primary, GCP as secondary for DR and ML workloads.',
        conflicting_decision: 'Standardise on single-cloud AWS. No GCP, no Azure.',
        conflicting_meeting_id: 'meeting_05_cloud_strategy',
        conflicting_meeting_date: '2025-09-30',
        conflicting_meeting_title: 'Cloud & Deployment Strategy',
      },
    ],
    transcript: `Meeting: Infrastructure Planning for 2026
Date: 2025-11-04
Attendees: Marc (CTO), David (Eng Lead), Karim (Backend Eng), Inès (Frontend Eng)

Marc: We need to revisit the cloud strategy. The analytics product line changed the equation.

David: GCP Vertex AI is materially better than SageMaker for what we're trying to do. I've spent two weeks on the comparison.

Karim: And BigQuery versus Redshift — BigQuery wins on query performance and cost at the data volumes we're projecting for next year.

Marc: Three enterprise customers have also asked about geographic redundancy for their DR requirements. AWS-only doesn't cover that cleanly.

Inès: What does this mean for the frontend infra?

Marc: CDN stays on CloudFront. The change is backend compute and data. Decision: move to multi-cloud. AWS primary for all existing workloads. GCP secondary for analytics, ML, and DR. I'll own the migration plan.

David: Timeline?

Marc: Q1 2026 for the GCP accounts and IAM. Q2 for the first workload migration.`,
  },
}

// Provide basic details for meetings without full mock data
for (const m of MOCK_MEETINGS) {
  if (!MOCK_DETAILS[m.id]) {
    MOCK_DETAILS[m.id] = {
      ...m,
      decisions: m.topics.map((topic) => ({
        topic,
        decision: `Decision made regarding ${topic.replace(/_/g, ' ')}.`,
        owner: m.attendees[0] ?? null,
        rationale: 'Rationale captured in the transcript.',
      })),
      contradictions: [],
      transcript: `Meeting: ${m.title}\nDate: ${m.date}\nAttendees: ${m.attendees.join(', ')}\n\n[Transcript not available in mock mode.]`,
    }
  }
}

export function getMockMeetingDetail(id: string): CalendarMeetingDetail | undefined {
  return MOCK_DETAILS[id]
}

export function getMockMeetings(from: string, to: string): CalendarMeeting[] {
  return MOCK_MEETINGS.filter((m) => m.date >= from && m.date <= to)
}

/** All unique topic slugs across all mock meetings */
export const ALL_MOCK_TOPICS: string[] = [
  ...new Set(MOCK_MEETINGS.flatMap((m) => m.topics)),
]
