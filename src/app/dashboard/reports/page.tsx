import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: auData } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  const accountId = auData?.account_id || user.id

  const [{ data: account }, { data: cdrs }] = await Promise.all([
    supabaseAdmin.from('accounts').select('name, brand_primary_color').eq('id', accountId).single(),
    supabaseAdmin
      .from('call_detail_records')
      .select('id, from_number, duration_sec, ai_summary, created_at, direction')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const primaryColor = (account as any)?.brand_primary_color || '#0C2C68'
  const accountName = (account as any)?.name || 'Your Business'

  return <ReportsClient calls={cdrs || []} primaryColor={primaryColor} accountName={accountName} />
}
