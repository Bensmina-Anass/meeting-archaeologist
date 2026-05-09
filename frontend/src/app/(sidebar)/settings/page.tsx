import { Card, Eyebrow, SectionHeader } from '@/components/ui'

export default function SettingsPage() {
  return (
    <div className="px-10 py-10 anim-fadeup">
      <Eyebrow>Configuration</Eyebrow>
      <SectionHeader>Settings</SectionHeader>
      <p className="mt-2 text-[13.5px] max-w-[520px]" style={{ color: 'rgba(0,78,100,0.70)' }}>
        Manage integrations, API keys, and workspace preferences.
      </p>

      <div className="mt-8 max-w-[520px]">
        <Card className="p-8">
          <div className="flex flex-col items-center text-center py-6">
            {/* Strata icon */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(0,78,100,0.06)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#004E64" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>

            <h3
              className="font-serif text-[24px] mb-2"
              style={{ color: '#004E64', letterSpacing: '-0.005em' }}
            >
              Coming soon
            </h3>
            <p className="text-[13px] max-w-[320px] leading-relaxed" style={{ color: '#96897B' }}>
              Settings for API keys, webhook configuration, team management, and
              integrations will be available here.
            </p>

            <div
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-mono uppercase"
              style={{
                background: 'rgba(0,78,100,0.06)',
                color: '#96897B',
                letterSpacing: '0.12em',
                border: '1px solid rgba(0,78,100,0.10)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#CE6C47' }}
              />
              In development
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
