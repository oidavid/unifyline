import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Phone, Mic, Target, Hash, CheckCircle } from 'lucide-react'

async function getAccountData() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: auData } = await admin
    .from('account_users').select('account_id').eq('user_id', user.id).single()
  if (!auData?.account_id) return null

  const accId = auData.account_id

  const [{ data: account }, { data: cdrs }, { data: dids }] = await Promise.all([
    admin.from('accounts').select('name, plan, created_at, brand_primary_color').eq('id', accId).single(),
    admin.from('call_detail_records').select('id, duration_sec, ai_summary').eq('account_id', accId),
    admin.from('account_phone_numbers').select('did_number').eq('account_id', accId),
  ])

  const allCalls = cdrs || []
  const withSummary = allCalls.filter((c: any) => c.ai_summary)

  return {
    accountName: account?.name || 'Your Account',
    planName: account?.plan || 'Enterprise Beta',
    memberSince: account?.created_at
      ? new Date(account.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : null,
    primaryColor: account?.brand_primary_color || '#0C2C68',
    usage: {
      totalCalls: allCalls.length,
      aiHandled: withSummary.length,
      leadsCaptured: withSummary.length,
      activeDids: dids?.length || 0,
    }
  }
}

export default async function AccountPage() {
  const data = await getAccountData()
  if (!data) redirect('/auth/login')

  const { accountName, planName, memberSince, primaryColor, usage } = data!
  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)

  const cardGradient = isDark
    ? 'linear-gradient(135deg, #E8C26A 0%, #C9A23F 50%, #A67C20 100%)'
    : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}BB)`
  const cardTextColor = isDark ? '#0A0A0A' : '#FFFFFF'
  const cardSubTextColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'
  const accentColor = isDark ? '#C9A23F' : primaryColor

  const stats = [
    { label: 'Total Calls', value: usage.totalCalls, icon: Phone, tip: 'All inbound calls' },
    { label: 'AI Handled', value: usage.aiHandled, icon: Mic, tip: 'Calls Aria answered' },
    { label: 'Leads Captured', value: usage.leadsCaptured, icon: Target, tip: 'Calls with AI summary' },
    { label: 'Active DIDs', value: usage.activeDids, icon: Hash, tip: 'Phone lines' },
  ]

  const features = [
    'AI Receptionist — always on, always answering',
    'Call summaries and transcripts',
    'Browser softphone (WebRTC)',
    'Team extensions',
    'Conference bridge',
    'Call logs and history',
    'Morning briefing emails',
  ]

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Account</h2>
        <p className="text-gray-500 mt-1 text-sm">{accountName} — plan and usage overview</p>
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ background: cardGradient }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: cardSubTextColor }}>
              Current Plan
            </p>
            <p className="text-2xl font-bold" style={{ color: cardTextColor }}>{planName}</p>
            {memberSince && (
              <p className="text-sm mt-1" style={{ color: cardSubTextColor }}>Member since {memberSince}</p>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold" style={{ color: cardTextColor }}>Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, tip }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} style={{ color: accentColor }} />
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{tip}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">What's included</h3>
        <div className="space-y-3">
          {features.map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle size={16} style={{ color: accentColor }} className="flex-shrink-0" />
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Need to make changes to your plan? Contact us at{' '}
            <a href="mailto:support@unifyline.com" style={{ color: accentColor }} className="underline">
              support@unifyline.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
