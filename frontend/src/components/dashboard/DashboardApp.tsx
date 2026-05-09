'use client'

import { useState, useEffect, useMemo } from 'react'
import { Icon } from './icons'
import { WeekCalendarView } from './WeekCalendarView'
import { TimelineView } from './TimelineView'
import { MeetingDetailPane } from './MeetingDetailPane'
import { fetchCalendarMeetings } from '@/lib/api'
import type { CalendarMeeting } from '@/types/calendar'

const C = { teal: '#004E64', burgundy: '#6B2737', muted: '#96897B', accent: '#CE6C47', canvas: '#EDFFEC' }

const HARDCODED_USER = { email: 'anass@outlook.com', password: 'anass', name: 'Anass Bensmina', initials: 'AB' }

const MsLogo = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
    <rect x="0" y="0" width="7" height="7" fill="#F25022"/>
    <rect x="9" y="0" width="7" height="7" fill="#7FBA00"/>
    <rect x="0" y="9" width="7" height="7" fill="#00A4EF"/>
    <rect x="9" y="9" width="7" height="7" fill="#FFB900"/>
  </svg>
)

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email === HARDCODED_USER.email && password === HARDCODED_USER.password) {
      onLogin()
    } else {
      setError('Invalid email or password.')
      setShake(true)
      setTimeout(() => setShake(false), 420)
    }
  }

  return (
    <div className="flex items-center justify-center paper-grain" style={{ height: '100vh', background: C.canvas }}>
      <div className="flex flex-col items-center" style={{ width: 400 }}>
        {/* Wordmark */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: C.teal, boxShadow: '0 4px 14px -4px rgba(0,78,100,0.4)' }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="1.6" rx="0.6" fill="#EDFFEC"/>
              <rect x="3" y="6" width="10" height="1.6" rx="0.6" fill="#CE6C47"/>
              <rect x="2" y="9" width="12" height="1.6" rx="0.6" fill="#EDFFEC" opacity="0.6"/>
              <rect x="4" y="12" width="8" height="1.6" rx="0.6" fill="#EDFFEC" opacity="0.35"/>
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-serif text-[24px]" style={{ color: C.teal, letterSpacing: '0.005em' }}>Meeting</div>
            <div className="font-serif italic text-[24px] -mt-1.5" style={{ color: C.accent }}>Archaeologist</div>
          </div>
        </div>

        {/* Card */}
        <div
          className={`w-full rounded-2xl p-8 ${shake ? 'anim-shake' : ''}`}
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(150,137,123,0.28)',
            boxShadow: '0 8px 40px -16px rgba(0,78,100,0.18)',
          }}
        >
          <h2 className="font-serif text-[28px] leading-tight mb-1" style={{ color: C.teal }}>Sign in</h2>
          <p className="text-[13px] mb-7" style={{ color: C.muted }}>
            Use your workspace credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase mb-1.5" style={{ color: C.muted, letterSpacing: '0.14em' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                placeholder="anass@outlook.com"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-2.5 text-[13.5px] outline-none transition"
                style={{
                  background: '#FAFFF9',
                  border: `1px solid ${error ? 'rgba(107,39,55,0.45)' : 'rgba(150,137,123,0.30)'}`,
                  color: C.teal,
                  fontFamily: 'inherit',
                }}
                onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(0,78,100,0.5)' }}
                onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(150,137,123,0.30)' }}
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase mb-1.5" style={{ color: C.muted, letterSpacing: '0.14em' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-2.5 text-[13.5px] outline-none transition"
                style={{
                  background: '#FAFFF9',
                  border: `1px solid ${error ? 'rgba(107,39,55,0.45)' : 'rgba(150,137,123,0.30)'}`,
                  color: C.teal,
                  fontFamily: 'inherit',
                }}
                onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(0,78,100,0.5)' }}
                onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(150,137,123,0.30)' }}
              />
            </div>

            {error && (
              <p className="text-[12px] rounded-lg px-3 py-2" style={{ background: 'rgba(107,39,55,0.07)', color: C.burgundy, border: '1px solid rgba(107,39,55,0.20)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-[14px] transition hover:brightness-110 mt-1"
              style={{ background: C.accent, color: '#fff', boxShadow: '0 8px 22px -10px rgba(206,108,71,0.55)' }}
            >
              <MsLogo size={15}/>
              Sign in with Microsoft
            </button>
          </form>

          <div className="mt-6 pt-5 border-t flex items-center justify-center gap-1.5"
               style={{ borderColor: 'rgba(150,137,123,0.20)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399', boxShadow: '0 0 0 2px rgba(52,211,153,0.22)' }}/>
            <span className="text-[11px] font-mono" style={{ color: C.muted, letterSpacing: '0.06em' }}>
              Outlook calendar · Secure SSO
            </span>
          </div>
        </div>

        <div className="mt-6 font-mono text-[10px] uppercase" style={{ color: 'rgba(0,78,100,0.35)', letterSpacing: '0.14em' }}>
          Field Notes · v0.1
        </div>
      </div>
    </div>
  )
}

type View = 'dash' | 'proj' | 'cont' | 'set'

function Sidebar({ active, setActive, counts, onLogout }: {
  active: View; setActive: (v: View) => void
  counts: { projects: number; decisions: number; contradictions: number }
  onLogout: () => void
}) {
  const items: { id: View; label: string; I: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement; badge?: number; alert?: boolean }[] = [
    { id: 'dash', label: 'Dashboard',      I: Icon.Dashboard },
    { id: 'proj', label: 'Projects',       I: Icon.Folder,  badge: counts.projects },
    { id: 'cont', label: 'Contradictions', I: Icon.Alert,   badge: counts.contradictions, alert: true },
    { id: 'set',  label: 'Settings',       I: Icon.Settings },
  ]

  return (
    <aside className="flex flex-col" style={{ width: 260, background: C.teal, color: '#EDFFEC' }}>
      {/* Wordmark */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
               style={{ background: 'rgba(237,255,236,0.10)', border: '1px solid rgba(237,255,236,0.18)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="1.6" rx="0.6" fill="#EDFFEC"/>
              <rect x="3" y="6" width="10" height="1.6" rx="0.6" fill="#CE6C47"/>
              <rect x="2" y="9" width="12" height="1.6" rx="0.6" fill="#EDFFEC" opacity="0.6"/>
              <rect x="4" y="12" width="8" height="1.6" rx="0.6" fill="#EDFFEC" opacity="0.35"/>
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-serif text-[19px]" style={{ color: '#EDFFEC', letterSpacing: '0.005em' }}>Meeting</div>
            <div className="font-serif italic text-[19px] -mt-1" style={{ color: C.accent }}>Archaeologist</div>
          </div>
        </div>
        <div className="mt-4 text-[10px] font-mono uppercase" style={{ color: 'rgba(237,255,236,0.45)', letterSpacing: '0.14em' }}>
          Field Notes · v0.1
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1">
        <div className="px-3 mb-2 text-[10px] font-mono uppercase"
             style={{ color: 'rgba(237,255,236,0.4)', letterSpacing: '0.16em' }}>Workspace</div>
        <ul className="flex flex-col gap-0.5">
          {items.map(({ id, label, I, badge, alert }) => {
            const isActive = active === id
            return (
              <li key={id}>
                <button
                  onClick={() => setActive(id)}
                  className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition relative"
                  style={{
                    background: isActive ? 'rgba(237,255,236,0.10)' : 'transparent',
                    color: isActive ? '#EDFFEC' : 'rgba(237,255,236,0.78)',
                  }}
                >
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r" style={{ background: C.accent }}/>}
                  <I width={18} height={18}/>
                  <span className="text-[13.5px] font-medium flex-1 text-left">{label}</span>
                  {badge != null && badge > 0 && (
                    <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-md"
                          style={{
                            background: alert ? 'rgba(206,108,71,0.18)' : 'rgba(237,255,236,0.10)',
                            color: alert ? C.accent : 'rgba(237,255,236,0.85)',
                            border: alert ? '1px solid rgba(206,108,71,0.45)' : '1px solid transparent',
                          }}>{badge}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer — user card */}
      <div className="px-3 pb-4">
        <div className="rounded-lg p-3 flex items-center gap-3"
             style={{ background: 'rgba(237,255,236,0.06)', border: '1px solid rgba(237,255,236,0.10)' }}>
          <div className="rounded-full flex items-center justify-center font-medium flex-shrink-0"
               style={{ width: 34, height: 34, background: C.accent, color: '#fff', fontSize: 13 }}>
            {HARDCODED_USER.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#EDFFEC' }}>
              {HARDCODED_USER.name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MsLogo size={11}/>
              <span className="text-[10.5px]" style={{ color: 'rgba(237,255,236,0.6)' }}>Signed in with Microsoft</span>
            </div>
          </div>
          <button onClick={onLogout} title="Sign out"
                  className="p-1 rounded hover:bg-white/10 flex-shrink-0 transition"
                  style={{ color: 'rgba(237,255,236,0.5)' }}>
            <Icon.X width={13} height={13}/>
          </button>
        </div>
      </div>
    </aside>
  )
}

function ContradictionsView({ meetings, onSelect }: { meetings: CalendarMeeting[]; onSelect: (id: string) => void }) {
  const cases = useMemo(() => {
    return meetings.filter(m => m.has_contradiction).flatMap(m =>
      m.contradicts_meeting_ids.map(otherId => {
        const other = meetings.find(x => x.id === otherId)
        if (!other) return null
        // deduplicate: only show the pair once (earlier meeting first)
        if (m.date > other.date) return null
        return { a: m, b: other }
      }).filter(Boolean)
    ) as { a: CalendarMeeting; b: CalendarMeeting }[]
  }, [meetings])

  return (
    <main className="flex-1 min-w-0 flex flex-col paper-grain" style={{ background: C.canvas }}>
      <div className="px-10 pt-9 pb-5 border-b" style={{ borderColor: 'rgba(150,137,123,0.25)' }}>
        <div className="font-mono text-[10.5px] uppercase" style={{ color: C.muted, letterSpacing: '0.18em' }}>Workspace</div>
        <h1 className="font-serif text-[44px] leading-[1.05] mt-1" style={{ color: C.teal, letterSpacing: '-0.005em' }}>Contradictions</h1>
        <p className="mt-2 text-[13.5px] max-w-[600px]" style={{ color: 'rgba(0,78,100,0.7)' }}>
          Decisions that reverse, narrow, or override an earlier ruling.<br/>
          Click a meeting to open its full decision record.
        </p>
      </div>

      <div className="px-10 py-8 flex-1 overflow-y-auto nice-scroll">
        {cases.length === 0 && (
          <div className="rounded-2xl px-6 py-16 flex flex-col items-center text-center"
               style={{ background: '#FFFFFF', border: '1px dashed rgba(150,137,123,0.40)' }}>
            <div className="font-mono text-[28px]" style={{ color: 'rgba(150,137,123,0.6)' }}>—</div>
            <div className="mt-3 text-[12.5px]" style={{ color: C.muted }}>No contradictions detected yet.</div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {cases.map(({ a, b }, i) => (
            <article key={i} className="rounded-2xl" style={{ background: C.canvas, border: '1px solid rgba(150,137,123,0.30)' }}>
              <header className="flex items-center gap-2 flex-wrap px-6 pt-5 pb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'rgba(0,78,100,0.08)', color: C.teal, border: '1px solid rgba(0,78,100,0.18)' }}>
                  {a.topics[0] ?? 'uncategorized'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold uppercase"
                      style={{ background: 'rgba(107,39,55,0.10)', color: C.burgundy, border: '1px solid rgba(107,39,55,0.30)', letterSpacing: '0.12em' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.burgundy }}/>HIGH
                </span>
              </header>

              <div className="px-6 pb-5 grid" style={{ gridTemplateColumns: '1fr 1px 1fr' }}>
                <div className="pr-6">
                  <div className="font-mono text-[10px] uppercase mb-2" style={{ color: C.muted, letterSpacing: '0.18em' }}>EARLIER RULING</div>
                  <button onClick={() => onSelect(a.id)}
                          className="text-[14px] leading-snug font-serif italic text-left hover:underline"
                          style={{ color: C.teal }}>
                    "{a.title}"
                  </button>
                  <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ color: C.muted }}>
                    <Icon.Clock width={11} height={11}/>
                    <span className="font-mono">{a.date}</span>
                    <span>·</span>
                    <Icon.Users width={11} height={11}/>
                    <span>{a.attendees.length}</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(150,137,123,0.30)' }}/>
                <div className="pl-6 relative">
                  <div className="absolute left-0 top-1 bottom-2 w-[3px] rounded-full" style={{ background: C.burgundy }}/>
                  <div className="pl-3">
                    <div className="font-mono text-[10px] uppercase mb-2" style={{ color: C.burgundy, letterSpacing: '0.18em' }}>REVERSAL</div>
                    <button onClick={() => onSelect(b.id)}
                            className="text-[14px] leading-snug font-serif italic text-left hover:underline"
                            style={{ color: C.teal }}>
                      "{b.title}"
                    </button>
                    <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ color: C.muted }}>
                      <Icon.Clock width={11} height={11}/>
                      <span className="font-mono">{b.date}</span>
                      <span>·</span>
                      <Icon.Users width={11} height={11}/>
                      <span>{b.attendees.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="px-6 py-3 flex items-center gap-3 border-t" style={{ borderColor: 'rgba(150,137,123,0.25)' }}>
                <button onClick={() => onSelect(a.id)} className="text-[11.5px] hover:underline" style={{ color: C.muted }}>
                  Open earlier meeting →
                </button>
                <button onClick={() => onSelect(b.id)}
                        className="ml-auto px-4 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{ background: C.accent, color: '#fff' }}>
                  Open case
                </button>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}

function SettingsView() {
  return (
    <main className="flex-1 min-w-0 flex flex-col paper-grain" style={{ background: C.canvas }}>
      <div className="px-10 pt-9 pb-5 border-b" style={{ borderColor: 'rgba(150,137,123,0.25)' }}>
        <div className="font-mono text-[10.5px] uppercase" style={{ color: C.muted, letterSpacing: '0.18em' }}>Workspace</div>
        <h1 className="font-serif text-[44px] leading-[1.05] mt-1" style={{ color: C.teal, letterSpacing: '-0.005em' }}>Settings</h1>
        <p className="mt-2 text-[13.5px] max-w-[600px]" style={{ color: 'rgba(0,78,100,0.7)' }}>
          Configure how your workspace gathers, indexes, and surfaces decisions.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-[28px]" style={{ color: 'rgba(150,137,123,0.6)' }}>—</div>
          <div className="mt-3 text-[12.5px]" style={{ color: C.muted }}>Settings coming soon.</div>
        </div>
      </div>
    </main>
  )
}

interface Props {
  initialMeetings: CalendarMeeting[]
}

export function DashboardApp({ initialMeetings }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('ma_logged_in') === 'true'
  })
  const [meetings, setMeetings] = useState<CalendarMeeting[]>(initialMeetings)
  const [active, setActive] = useState<View>('proj')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleLogin() {
    localStorage.setItem('ma_logged_in', 'true')
    setIsLoggedIn(true)
  }

  function handleLogout() {
    localStorage.removeItem('ma_logged_in')
    setIsLoggedIn(false)
  }

  // Refresh: fetch a wide date range covering all our data
  useEffect(() => {
    fetchCalendarMeetings('2025-01-01', '2026-12-31')
      .then(setMeetings)
      .catch(console.error)
  }, [])

  const counts = useMemo(() => ({
    projects: new Set(meetings.flatMap(m => m.topics[0] ? [m.topics[0]] : [])).size,
    decisions: meetings.reduce((s, m) => s + m.decision_count, 0),
    contradictions: meetings.filter(m => m.has_contradiction).length,
  }), [meetings])

  const showRightPane = active === 'dash' || active === 'proj' || active === 'cont'

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin}/>
  }

  return (
    <div className="flex" style={{ height: '100vh', minWidth: 1280, background: C.canvas }}>
      <Sidebar active={active} setActive={setActive} counts={counts} onLogout={handleLogout}/>

      {active === 'dash' && (
        <WeekCalendarView meetings={meetings} selectedId={selectedId} onSelect={setSelectedId}/>
      )}
      {active === 'proj' && (
        <TimelineView meetings={meetings} selectedId={selectedId} onSelect={setSelectedId}/>
      )}
      {active === 'cont' && (
        <ContradictionsView meetings={meetings} onSelect={(id) => { setSelectedId(id); setActive('proj') }}/>
      )}
      {active === 'set' && <SettingsView/>}

      {showRightPane && (
        <MeetingDetailPane
          meetingId={selectedId}
          allMeetings={meetings}
          onMeetingClick={(id) => { setSelectedId(id); setActive('proj') }}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
