import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
import { redirect } from 'next/navigation'
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Mic, MessageSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'

function formatDid(did: string): string {
  const d = (did || '').replace(/\D/g, '').replace(/^1/, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return did
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, first_name').eq('id', user.id).single()
  const { data: accountUser } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
  const accountId = accountUser?.account_id || user.id

  // --- Tenant branding + numbers (dynamic — no hardcoded IntelSys) ---
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('name, brand_primary_color')
    .eq('id', accountId)
    .single()
  const { data: didRows } = await supabaseAdmin
    .from('account_phone_numbers')
    .select('did_number')
    .eq('account_id', accountId)

  const brandColor = account?.brand_primary_color || '#0C2C68'
  const dids = (didRows?.map(d => d.did_number) || []).filter(Boolean)
  const primaryDid = dids[0] ? formatDid(dids[0]) : null
  // ------------------------------------------------------------------

  const { data: cdrs } = await supabaseAdmin.from('call_detail_records').select('*').eq('account_id', accountId).order('created_at', { ascending: false }).limit(5)
  const { count: totalCalls } = await supabaseAdmin.from('call_detail_records').select('*', { count: 'exact', head: true }).eq('account_id', accountId)
  const { count: inboundCalls } = await supabaseAdmin.from('call_detail_records').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('direction', 'inbound')
  const { count: outboundCalls } = await supabaseAdmin.from('call_detail_records').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('direction', 'outbound')
  const { data: aiConfig } = await supabase.from('ai_receptionist_config').select('active, greeting_text').eq('tenant_account_id', accountId).single()
  const { data: allCdrs } = await supabaseAdmin.from('call_detail_records').select('duration_sec').eq('account_id', accountId)

  const avgDuration = allCdrs && allCdrs.length > 0 ? Math.round(allCdrs.reduce((a, c) => a + (c.duration_sec || 0), 0) / allCdrs.length) : 0
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const aiCallsCount = cdrs?.filter(c => c.ai_summary).length || 0

  // Use first_name from profile, fall back to first word of full_name, then email prefix
  const firstName = profile?.first_name
    || profile?.full_name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'there'

  const testNumberLine = primaryDid
    ? `Call ${primaryDid} to test your AI receptionist`
    : 'Add a number to start testing your AI receptionist'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mt-1">Welcome back, <span className="font-medium text-gray-700">{firstName}</span></p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${aiConfig?.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <div className={`w-2 h-2 rounded-full ${aiConfig?.active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          AI {aiConfig?.active ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Calls', value: totalCalls || 0, icon: Phone, color: 'bg-blue-500' },
          { label: 'Inbound', value: inboundCalls || 0, icon: PhoneIncoming, color: 'bg-green-500' },
          { label: 'Outbound', value: outboundCalls || 0, icon: PhoneOutgoing, color: 'bg-purple-500' },
          { label: 'Avg Duration', value: formatDuration(avgDuration), icon: Clock, color: 'bg-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4 border border-gray-100">
            <div className={`${color} p-3 rounded-xl`}><Icon size={22} className="text-white" /></div>
            <div>
              <p className="text-gray-500 text-sm">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/ai-receptionist" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
              <div className="p-2 rounded-lg" style={{ backgroundColor: brandColor }}><Mic size={16} className="text-white" /></div>
              <div><p className="text-sm font-medium text-gray-900">Configure AI Receptionist</p><p className="text-xs text-gray-500">Update greeting and behavior</p></div>
            </Link>
            <Link href="/dashboard/conference" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
              <div className="bg-purple-600 p-2 rounded-lg"><Phone size={16} className="text-white" /></div>
              <div><p className="text-sm font-medium text-gray-900">Conference Bridge</p><p className="text-xs text-gray-500">Start or manage conference calls</p></div>
            </Link>
            <Link href="/dashboard/calls" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
              <div className="bg-green-600 p-2 rounded-lg"><MessageSquare size={16} className="text-white" /></div>
              <div><p className="text-sm font-medium text-gray-900">View Call Summaries</p><p className="text-xs text-gray-500">AI-generated call insights</p></div>
            </Link>
          </div>
        </div>

        <div className="rounded-xl shadow-sm p-6 text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}>
          <div className="flex items-center gap-2 mb-4"><Mic size={20} /><h3 className="text-base font-semibold">AI Receptionist</h3></div>
          <div className="space-y-3">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Current Greeting</p>
              <p className="text-sm text-white leading-relaxed italic">&ldquo;{aiConfig?.greeting_text || 'Not configured yet'}&rdquo;</p>
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Your DID Numbers</p>
              {dids.length > 0 ? (
                dids.map(did => (
                  <p key={did} className="text-sm font-mono text-white">{formatDid(did)}</p>
                ))
              ) : (
                <p className="text-sm font-mono text-white/60">No numbers assigned yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={20} style={{ color: brandColor }} /><h3 className="text-base font-semibold text-gray-900">AI Activity</h3></div>
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Calls handled by AI</span><span className="text-sm font-bold text-gray-900">{inboundCalls || 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Calls with summaries</span><span className="text-sm font-bold text-gray-900">{aiCallsCount}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-600">AI adoption rate</span><span className="text-sm font-bold text-green-600">{totalCalls ? Math.round((inboundCalls || 0) / totalCalls * 100) : 0}%</span></div>
            <div className="pt-3 border-t border-gray-100"><p className="text-xs text-gray-400">{testNumberLine}</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Recent Calls</h3>
          <Link href="/dashboard/calls" className="text-sm hover:underline" style={{ color: brandColor }}>View all</Link>
        </div>
        {cdrs && cdrs.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {cdrs.map(cdr => (
              <div key={cdr.id} className="p-5 hover:bg-gray-50 transition">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg mt-0.5 ${cdr.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {cdr.direction === 'inbound' ? <PhoneIncoming size={16} className="text-green-600" /> : <PhoneOutgoing size={16} className="text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-900">{cdr.direction === 'inbound' ? cdr.from_number : cdr.to_number}</span>
                      <span className="text-xs text-gray-400">{cdr.duration_sec}s</span>
                      {cdr.ai_summary && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">AI Summary</span>}
                    </div>
                    {cdr.ai_summary && <p className="text-sm text-gray-600 leading-relaxed">{cdr.ai_summary}</p>}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(cdr.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Phone size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No calls yet</p>
            <p className="text-sm mt-1">{testNumberLine}</p>
          </div>
        )}
      </div>
    </div>
  )
}
