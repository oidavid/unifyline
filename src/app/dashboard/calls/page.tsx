import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import CallLogsClient from './CallLogsClient'

// Server component — fetches CDRs + tenant color before paint, passes to client.
// Voicemails are fetched client-side via /api/voicemail and merged into the timeline.
export default async function CallLogsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Multi-tenant: get account_id from account_users, not user.id directly
  const { data: auData } = await admin
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  const accountId = auData?.account_id || user.id

  let primaryColor = '#0C2C68'
  try {
    const { data: account } = await admin
      .from('accounts').select('brand_primary_color').eq('id', accountId).single()
    primaryColor = account?.brand_primary_color || '#0C2C68'
  } catch {}

  const { data: cdrs } = await admin
    .from('call_detail_records')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(100)

  return <CallLogsClient initialColor={primaryColor} initialCdrs={cdrs || []} />
}