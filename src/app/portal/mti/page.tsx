import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const MTI_ACCOUNT_ID = '5f646bc2-9bf3-47cb-9859-2871d4322e19'
const MTI_LOGO_URL = 'https://mtipremiumcharters.com/uploads/company/lgo_mti__68daa57a29067.png'

const GOLD = '#D4B483'
const BLACK = '#0A0A0A'
const IVORY = '#F7F5F0'
const INK = '#1C1C1C'
const TAUPE = '#8A8378'
const GREEN = '#1F4D3A'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CallRecord {
  call_uuid: string
  from_number: string
  status: string
  duration_sec: number
  ai_summary: string
  created_at: string
}

function formatPhoneNumber(num: string): string {
  const digits = num.replace(/\D/g, '').replace(/^1/, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return num
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

async function getMtiCalls(): Promise<CallRecord[]> {
  const { data } = await supabase
    .from('call_detail_records')
    .select('call_uuid, from_number, status, duration_sec, ai_summary, created_at')
    .eq('account_id', MTI_ACCOUNT_ID)
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}

export default async function MTIPortalPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('mti_portal_session')

  if (!session || session.value !== 'authenticated') {
    redirect('/portal/mti/login')
  }

  const calls = await getMtiCalls()
  const totalCalls = calls.length
  const last24h = calls.filter(c => {
    const callTime = new Date(c.created_at).getTime()
    return Date.now() - callTime < 24 * 60 * 60 * 1000
  }).length
  const avgDuration = calls.length > 0
    ? Math.round(calls.reduce((sum, c) => sum + (c.duration_sec || 0), 0) / calls.length)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: IVORY, color: INK, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* Quiet top bar - no sidebar, no internal app chrome */}
      <header
        style={{
          background: BLACK,
          padding: '28px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MTI_LOGO_URL} alt="MTI Premium Charters" style={{ height: '46px', width: 'auto' }} />

        <form action="/portal/mti/api/logout" method="POST">
          <button
            type="submit"
            style={{
              background: 'transparent',
              border: `1px solid ${GOLD}`,
              color: GOLD,
              fontFamily: 'Arial, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </form>
      </header>

      <main style={{ padding: '56px 48px', maxWidth: '1080px', margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: '48px' }}>
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TAUPE,
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            Call Intelligence
          </div>
          <h1 style={{ fontSize: '32px', margin: 0, fontWeight: 'normal', color: BLACK }}>
            Your AI Receptionist, at a glance
          </h1>
        </div>

        {/* Ledger-style stat cards - the signature element */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1px',
            background: '#D8D2C4',
            marginBottom: '56px',
            border: '1px solid #D8D2C4',
          }}
        >
          <LedgerCard label="Total Calls" value={totalCalls} />
          <LedgerCard label="Last 24 Hours" value={last24h} />
          <LedgerCard label="Avg. Call Length" value={avgDuration > 0 ? formatDuration(avgDuration) : '—'} />
          <LedgerCard label="Lines Active" value={3} accent />
        </div>

        {/* Call log */}
        <div
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TAUPE,
            fontWeight: 700,
            marginBottom: '20px',
            paddingBottom: '14px',
            borderBottom: `2px solid ${BLACK}`,
          }}
        >
          Recent Calls
        </div>

        {calls.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E0D5',
              padding: '72px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '17px', color: BLACK, marginBottom: '8px' }}>
              No calls yet
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: TAUPE }}>
              Once your AI Receptionist line receives a call, it will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {calls.map((call, i) => (
              <div
                key={call.call_uuid}
                style={{
                  background: '#FFFFFF',
                  borderLeft: `3px solid ${GOLD}`,
                  borderBottom: i === calls.length - 1 ? 'none' : '1px solid #ECE7DA',
                  padding: '22px 28px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '18px', color: BLACK }}>
                    {formatPhoneNumber(call.from_number)}
                  </div>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: TAUPE, letterSpacing: '0.02em' }}>
                    {formatDate(call.created_at)} &middot; {formatDuration(call.duration_sec)}
                  </div>
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#4A453C', lineHeight: '1.6' }}>
                  {call.ai_summary || 'No summary available.'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: '64px',
            paddingTop: '24px',
            borderTop: '1px solid #E5E0D5',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#A8A296',
            letterSpacing: '0.04em',
          }}
        >
          MTI Premium Charters &middot; Powered by UnifyLine
        </div>
      </main>
    </div>
  )
}

function LedgerCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ background: IVORY, padding: '28px 24px' }}>
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: TAUPE,
          fontWeight: 700,
          marginBottom: '14px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '40px',
          color: accent ? GREEN : BLACK,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  )
}
