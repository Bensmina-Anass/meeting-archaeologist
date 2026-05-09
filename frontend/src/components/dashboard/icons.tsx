import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Icon = {
  Dashboard: (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/></svg>,
  Folder:    (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M3 6.5A2 2 0 0 1 5 4.5h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10.5z"/></svg>,
  Gavel:     (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="m14 4 6 6"/><path d="m11 7 6 6"/><path d="m9 9 6 6-3 3-6-6 3-3z"/><path d="M3 21h8"/></svg>,
  Alert:     (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.4 14.18A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.7-2.96L10.3 3.86z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  Settings:  (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Chevron:   (p: P) => <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p}><path d="m6 9 6 6 6-6"/></svg>,
  Users:     (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Clock:     (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  Chat:      (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.13L4 20l.87-5.4A8 8 0 1 1 21 12z"/></svg>,
  Send:      (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>,
  Sparkle:   (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="m5.6 18.4 2.8-2.8"/><path d="m15.6 8.4 2.8-2.8"/></svg>,
  Link:      (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>,
  X:         (p: P) => <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Plus:      (p: P) => <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8} {...p}><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
  Search:    (p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Transcript:(p: P) => <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 4h12l4 4v12H4V4z"/><path d="M16 4v4h4"/><path d="M8 12h8"/><path d="M8 16h8"/><path d="M8 8h3"/></svg>,
}
