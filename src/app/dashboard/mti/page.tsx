import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const MTI_ACCOUNT_ID = '5f646bc2-9bf3-47cb-9859-2871d4322e19'
const MTI_LOGO_URL = 'https://mtipremiumcharters.com/uploads/company/lgo_mti__68daa57a29067.png'

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

export default async function MTIDashboard() {
  const calls = await getMtiCalls()
  const totalCalls = calls.length
  const last24h = calls.filter(c => {
    const callTime = new Date(c.created_at).getTime()
    return Date.now() - callTime < 24 * 60 * 60 * 1000
  }).length

  const GOLD = '#C9A876'
  const BLACK = '#0A0A0A'
  const INK = '#1C1C1C'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', color: BLACK, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* Header */}
      <header style={{
        background: BLACK,
        padding: '24px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: `3px solid ${GOLD}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MTI_LOGO_URL}
            alt="MTI Premium Charters"
            style={{ height: '48px', width: 'auto' }}
          />
          <div>
            <div style={{ fontSize: '12px', color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>
              AI Receptionist &middot; Call Activity
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          color: '#8A8378',
          textAlign: 'right',
          letterSpacing: '0.05em',
        }}>
          POWERED BY UNIFYLINE
        </div>
      </header>

      <main style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          <div style={{ background: BLACK, borderRadius: '4px', padding: '24px', borderBottom: `4px solid ${GOLD}` }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9A9388', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 700 }}>
              Total Calls
            </div>
            <div style={{ fontSize: '38px', color: GOLD, fontWeight: 'bold' }}>{totalCalls}</div>
          </div>
          <div style={{ background: BLACK, borderRadius: '4px', padding: '24px', borderBottom: `4px solid ${GOLD}` }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9A9388', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 700 }}>
              Last 24 Hours
            </div>
            <div style={{ fontSize: '38px', color: '#FFFFFF', fontWeight: 'bold' }}>{last24h}</div>
          </div>
          <div style={{ background: BLACK, borderRadius: '4px', padding: '24px', borderBottom: `4px solid ${GOLD}` }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9A9388', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontWeight: 700 }}>
              Lines Active
            </div>
            <div style={{ fontSize: '38px', color: '#FFFFFF', fontWeight: 'bold' }}>3</div>
          </div>
        </div>

        {/* Call log */}
        <div style={{
          marginBottom: '16px',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: BLACK,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          borderBottom: `2px solid ${BLACK}`,
          paddingBottom: '10px',
        }}>
          Recent Calls
        </div>

        {calls.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            border: `1px solid #E5E0D5`,
            borderRadius: '4px',
            padding: '60px 24px',
            textAlign: 'center',
            color: '#8A8378',
            fontFamily: 'Arial, sans-serif',
          }}>
            No calls yet. Once your AI Receptionist line starts receiving calls, they will appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {calls.map((call) => (
              <div
                key={call.call_uuid}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E0D5',
                  borderLeft: `4px solid ${GOLD}`,
                  borderRadius: '4px',
                  padding: '20px 24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '17px', color: INK, fontWeight: 'bold' }}>
                    {formatPhoneNumber(call.from_number)}
                  </div>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8A8378' }}>
                    {formatDate(call.created_at)} &middot; {formatDuration(call.duration_sec)}
                  </div>
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#4A453C', lineHeight: '1.5' }}>
                  {call.ai_summary || 'No summary available.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
