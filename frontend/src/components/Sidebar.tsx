'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/',
    label: 'Calendar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/meetings',
    label: 'Meetings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <path d="M3 6.5A2 2 0 0 1 5 4.5h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10.5z"/>
      </svg>
    ),
  },
  {
    href: '/topics',
    label: 'Topics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <path d="m14 4 6 6"/><path d="m11 7 6 6"/><path d="m9 9 6 6-3 3-6-6 3-3z"/>
        <path d="M3 21h8"/>
      </svg>
    ),
  },
  {
    href: '/contradictions',
    label: 'Contradictions',
    alert: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.4 14.18A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.7-2.96L10.3 3.86z"/>
        <path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

interface SidebarProps {
  contradictionCount: number
}

export function Sidebar({ contradictionCount }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: 240, background: '#004E64', color: '#EDFFEC' }}
    >
      {/* Wordmark */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/meetings" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(237,255,236,0.10)',
              border: '1px solid rgba(237,255,236,0.18)',
            }}
          >
            {/* Layered strata mark */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="1.6" rx="0.6" fill="#EDFFEC" />
              <rect x="3" y="6" width="10" height="1.6" rx="0.6" fill="#CE6C47" />
              <rect x="2" y="9" width="12" height="1.6" rx="0.6" fill="#EDFFEC" opacity="0.6" />
              <rect x="4" y="12" width="8" height="1.6" rx="0.6" fill="#EDFFEC" opacity="0.35" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-serif text-[18px]" style={{ color: '#EDFFEC', letterSpacing: '0.005em' }}>
              Meeting
            </div>
            <div className="font-serif italic text-[18px] -mt-1" style={{ color: '#CE6C47' }}>
              Archaeologist
            </div>
          </div>
        </Link>
        <div
          className="mt-3 text-[10px] font-mono uppercase"
          style={{ color: 'rgba(237,255,236,0.40)', letterSpacing: '0.14em' }}
        >
          Field Notes · v0.1
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1">
        <div
          className="px-3 mb-2 text-[10px] font-mono uppercase"
          style={{ color: 'rgba(237,255,236,0.40)', letterSpacing: '0.16em' }}
        >
          Workspace
        </div>
        <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
          {NAV.map(({ href, label, icon, alert }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            const showBadge = alert && contradictionCount > 0
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors no-underline"
                  style={{
                    background: isActive ? 'rgba(237,255,236,0.10)' : 'transparent',
                    color: isActive ? '#EDFFEC' : 'rgba(237,255,236,0.75)',
                  }}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                      style={{ background: '#CE6C47' }}
                    />
                  )}
                  {icon}
                  <span className="text-[13.5px] font-medium flex-1">{label}</span>
                  {showBadge && (
                    <span
                      className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(206,108,71,0.18)',
                        color: '#CE6C47',
                        border: '1px solid rgba(206,108,71,0.45)',
                      }}
                    >
                      {contradictionCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer spacer */}
      <div className="pb-6 px-5">
        <div
          className="text-[10px] font-mono uppercase"
          style={{ color: 'rgba(237,255,236,0.30)', letterSpacing: '0.12em' }}
        >
          Meeting Archaeologist
        </div>
      </div>
    </aside>
  )
}
