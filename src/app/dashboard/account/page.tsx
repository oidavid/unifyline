import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

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
    admin.from('accounts').select('name, plan, created_at, brand_primary_color, alert_email, alert_phone').eq('id', accId).single(),
    admin.from('call_detail_records').select('id, duration_sec, ai_summary').eq('account_id', accId),
    admin.from('account_phone_numbers').select('did_number').eq('account_id', accId),
  ])

  const allCalls = cdrs || []
  const withSummary = allCalls.filter((c: any) => c.ai_summary)

  return {
    accountId: accId,
    accountName: (account as any)?.name || 'Your Account',
    planName: (account as any)?.plan || 'Enterprise Beta',
    primaryColor: (account as any)?.brand_primary_color || '#0C2C68',
    alertEmail: (account as any)?.alert_email || '',
    alertPhone: (account as any)?.alert_phone || '',
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
  return <AccountClient data={data!} />
}