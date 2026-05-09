'use client'

import { useState, useMemo } from 'react'
import { Icon } from './icons'
import { topicColor } from '@/lib/colors'
import type { CalendarMeeting } from '@/types/calendar'

const C = { teal: '#004E64', burgundy: '#6B2737', muted: '#96897B', accent: '#CE6C47', canvas: '#EDFFEC' }

function fmtShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Project {
  id: string
  name: string
  color: string
  meetings: CalendarMeeting[]
  hasContradiction: boolean
}

function groupByTopic(meetings: CalendarMeeting[]): Project[] {
  const map = new Map<string, CalendarMeeting[]>()
  for (const m of meetings) {
    const topic = m.topics[0] ?? 'uncategorized'
    const arr = map.get(topic) ?? []
    arr.push(m)
    map.set(topic, arr)
  }
  return [...map.entries()].map(([topic, ms]) => ({
    id: topic,
    name: topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    color: topicColor(topic),
    meetings: ms.sort((a, b) => a.date.localeCompare(b.date)),
    hasContradiction: ms.some(m => m.has_contradiction),
  })).sort((a, b) => a.meetings[0].date.localeCompare(b.meetings[0].date))
}

function MeetingNode({
  m, selected, onSelect, onHover, color,
}: {
  m: CalendarMeeting; selected: boolean; onSelect: () => void; onHover: (v: CalendarMeeting | null) => void; color: string
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ minWidth: 96 }}
      onMouseEnter={() => { setHover(true); onHover(m) }}
      onMouseLeave={() => { setHover(false); onHover(null) }}
    >
      <button
        onClick={onSelect}
        className="relative flex items-center justify-center transition-transform"
        style={{ width: 32, height: 32, transform: selected ? 'scale(1.18)' : hover ? 'scale(1.08)' : 'scale(1)', cursor: 'pointer' }}
      >
        <span className="absolute inset-0 rounded-full transition"
              style={{ border: m.has_contradiction ? `2px solid ${C.burgundy}` : selected ? `2px solid ${color}` : hover ? `2px solid ${color}66` : '2px solid transparent' }}/>
        <span className="rounded-full transition"
              style={{
                width: 16, height: 16,
                background: selected ? C.accent : m.has_contradiction ? '#FFFFFF' : C.canvas,
                border: selected ? `2px solid ${C.accent}` : `2px solid ${m.has_contradiction ? C.burgundy : color}`,
                boxShadow: selected ? '0 0 0 3px rgba(206,108,71,0.18)' : 'none',
              }}/>
        {m.has_contradiction && (
          <span className="absolute -top-1 -right-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ width: 14, height: 14, background: C.burgundy, color: '#fff', animation: 'pulseRing 2.4s ease-out infinite' }}>!</span>
        )}
      </button>

      <div className="mt-2.5 text-center px-1 max-w-[110px]">
        <div className="text-[11px] font-semibold leading-tight" style={{ color: selected ? C.teal : 'rgba(0,78,100,0.85)' }}>
          {m.title}
        </div>
        <div className="mt-1 text-[10px] font-mono" style={{ color: C.muted }}>{fmtShort(m.date)}</div>
        <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full"
             style={{ background: 'rgba(150,137,123,0.14)', border: '1px solid rgba(150,137,123,0.25)' }}>
          <Icon.Users width={9} height={9} style={{ color: C.muted }}/>
          <span className="text-[9.5px] font-mono" style={{ color: C.muted }}>{m.attendees.length}</span>
        </div>
      </div>

      {hover && (
        <div className="absolute z-20" style={{ bottom: 'calc(100% + 14px)', width: 240 }}>
          <div className="rounded-lg p-3 text-[11.5px] leading-snug"
               style={{ background: C.teal, color: '#EDFFEC', boxShadow: '0 12px 30px -12px rgba(0,78,100,0.45)' }}>
            <div className="font-mono text-[9.5px] uppercase mb-1" style={{ color: 'rgba(237,255,236,0.6)', letterSpacing: '0.14em' }}>
              {fmtDate(m.date)} · {m.decision_count} decision{m.decision_count !== 1 ? 's' : ''}
            </div>
            <div>{m.attendees.join(', ') || 'No attendees'}</div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2"
               style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${C.teal}` }}/>
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project, expanded, onToggle, selectedId, onSelect,
}: {
  project: Project; expanded: boolean; onToggle: () => void; selectedId: string | null; onSelect: (id: string) => void
}) {
  const [hovered, setHovered] = useState<CalendarMeeting | null>(null)

  return (
    <section className="rounded-2xl"
             style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.28)', boxShadow: '0 1px 0 rgba(0,78,100,0.02), 0 8px 30px -22px rgba(0,78,100,0.18)' }}>
      <header className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }}/>
            <h3 className="font-serif text-[21px] leading-tight" style={{ color: C.teal }}>{project.name}</h3>
            {project.hasContradiction && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: 'rgba(107,39,55,0.08)', color: C.burgundy, border: '1px solid rgba(107,39,55,0.30)' }}>
                <Icon.Alert width={11} height={11}/> contradiction
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2.5 text-[11.5px]" style={{ color: C.muted }}>
            <span>{project.meetings.length} meeting{project.meetings.length !== 1 ? 's' : ''}</span>
            <span style={{ color: 'rgba(150,137,123,0.5)' }}>·</span>
            <span>{fmtShort(project.meetings[0].date)} → {fmtShort(project.meetings[project.meetings.length - 1].date)}</span>
          </div>
        </div>
        <span className="flex items-center justify-center w-8 h-8 rounded-full transition"
              style={{ background: 'rgba(0,78,100,0.06)', color: C.teal, transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <Icon.Chevron width={16} height={16}/>
        </span>
      </header>

      {expanded && (
        <div className="px-3 pb-6">
          <div className="relative pt-2 pb-1 px-2 overflow-x-auto nice-scroll">
            {/* axis line */}
            <div className="absolute left-6 right-6 h-[2px]"
                 style={{ background: `repeating-linear-gradient(to right, ${project.color} 0 6px, transparent 6px 12px)`, top: 28 }}/>
            <div className="relative flex items-start" style={{ gap: 8 }}>
              {project.meetings.map((m, i) => (
                <MeetingNode
                  key={m.id}
                  m={m}
                  color={project.color}
                  selected={selectedId === m.id}
                  onSelect={() => onSelect(m.id)}
                  onHover={setHovered}
                />
              ))}
              {/* placeholder */}
              <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
                <div className="flex items-center justify-center rounded-full"
                     style={{ width: 32, height: 32, border: `1.5px dashed ${C.muted}`, background: C.canvas, color: C.muted }}>
                  <Icon.Plus width={14} height={14}/>
                </div>
                <div className="mt-2.5 text-[10.5px] font-mono uppercase text-center"
                     style={{ color: C.muted, letterSpacing: '0.08em' }}>next<br/>scheduled</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

interface Props {
  meetings: CalendarMeeting[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TimelineView({ meetings, selectedId, onSelect }: Props) {
  const projects = useMemo(() => groupByTopic(meetings), [meetings])
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(projects.map(p => [p.id, true]))
  )
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return projects
    const q = search.toLowerCase()
    return projects
      .map(p => ({ ...p, meetings: p.meetings.filter(m => m.title.toLowerCase().includes(q) || m.topics.some(t => t.includes(q))) }))
      .filter(p => p.name.toLowerCase().includes(q) || p.meetings.length > 0)
  }, [projects, search])

  const totalDecisions = meetings.reduce((s, m) => s + m.decision_count, 0)
  const totalContradictions = meetings.filter(m => m.has_contradiction).length

  return (
    <main className="flex-1 min-w-0 flex flex-col paper-grain" style={{ background: C.canvas }}>
      <div className="px-10 pt-9 pb-6 flex items-end gap-6 border-b" style={{ borderColor: 'rgba(150,137,123,0.25)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10.5px] uppercase" style={{ color: C.muted, letterSpacing: '0.18em' }}>Workspace</div>
          <h1 className="font-serif text-[44px] leading-[1.05] mt-1" style={{ color: C.teal, letterSpacing: '-0.005em' }}>Projects</h1>
          <p className="mt-1.5 text-[13.5px] max-w-[560px]" style={{ color: 'rgba(0,78,100,0.7)' }}>
            Every meeting, decision, and reversal — laid out in chronological strata.
            Burgundy markers indicate decisions that contradict an earlier ruling.
          </p>
        </div>
      </div>

      <div className="px-10 pt-5 pb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3.5 h-10 rounded-full flex-1 max-w-[460px]"
             style={{ background: '#FFFFFF', border: '1px solid rgba(150,137,123,0.30)' }}>
          <Icon.Search width={15} height={15} style={{ color: C.muted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search topics, meetings, attendees…"
                 className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-70"
                 style={{ color: C.teal }}/>
        </div>
        <div className="ml-auto text-[11.5px] font-mono" style={{ color: C.muted, letterSpacing: '0.06em' }}>
          {meetings.length} meetings · {totalDecisions} decisions
          {totalContradictions > 0 && <span style={{ color: C.burgundy }}> · {totalContradictions} contradictions</span>}
        </div>
      </div>

      <div className="px-10 pb-12 flex-1 overflow-y-auto nice-scroll">
        <div className="flex flex-col gap-5">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              expanded={expanded[p.id] ?? true}
              onToggle={() => setExpanded(s => ({ ...s, [p.id]: !s[p.id] }))}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between text-[10.5px] font-mono uppercase"
             style={{ color: C.muted, letterSpacing: '0.14em' }}>
          <span>{meetings.length} meetings indexed · {totalDecisions} decisions catalogued</span>
          <span>meeting archaeologist · v0.1</span>
        </div>
      </div>
    </main>
  )
}
