import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Phone, Mic, Clock, CheckCircle } from 'lucide-react'

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

  const totalMinutes = Math.round(
    (cdrs || []).reduce((sum: number, c: any) => sum + (c.duration_sec || 0), 0) / 60
  )

  return {
    planName: account?.plan || 'Beta',
    memberSince: account?.created_at
      ? new Date(account.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : null,
    primaryColor: account?.brand_primary_color || '#0C2C68',
    usage: {
      calls: cdrs?.length || 0,
      aiCalls: cdrs?.filter((c: any) => c.ai_summary)?.length || 0,
      minutes: totalMinutes,
      dids: dids?.length || 0,
    }
  }
}

export default async function AccountPage() {
  const data = await getAccountData()
  if (!data) redirect('/auth/login')

  const { planName, memberSince, primaryColor, usage } = data!
  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)
  const accentColor = isDark ? '#E8C26A' : primaryColor

  const stats = [
    { label: 'Total Calls', value: usage.calls, icon: Phone },
    { label: 'AI Handled', value: usage.aiCalls, icon: Mic },
    { label: 'Minutes Used', value: usage.minutes, icon: Clock },
    { label: 'Active DIDs', value: usage.dids, icon: CheckCircle },
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
        <p className="text-gray-500 mt-1 text-sm">Your plan and usage at a glance</p>
      </div>

      {/* Plan card */}
      <div
        className="rounded-xl p-5 mb-6 text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}BB)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80 mb-1">Current Plan</p>
            <p className="text-2xl font-bold">{planName}</p>
            {memberSince && (
              <p className="text-sm opacity-70 mt-1">Member since {memberSince}</p>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            <span className="text-sm font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} style={{ color: accentColor }} />
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Features */}
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
