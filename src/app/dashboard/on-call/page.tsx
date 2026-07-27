import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import OnCallClient from './OnCallClient'

export default async function OnCallPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: auData } = await admin
    .from('account_users').select('account_id').eq('user_id', user.id).single()
  const accountId = auData?.account_id || user.id

  let primaryColor = '#0C2C68'
  try {
    const { data: account } = await admin
      .from('accounts').select('brand_primary_color').eq('id', accountId).single()
    primaryColor = account?.brand_primary_color || '#0C2C68'
  } catch {}

  return <OnCallClient initialColor={primaryColor} />
}