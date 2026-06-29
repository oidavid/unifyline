import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PhoneClient from './PhoneClient'

// Server component — fetches tenant color before any paint, passes to client.
// This eliminates the SSR/hydration mismatch that caused the blue flash.
export default async function PhonePage() {
  let primaryColor = '#0C2C68'

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createAdminClient(
        (process as any).env.NEXT_PUBLIC_SUPABASE_URL,
        (process as any).env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: auData } = await admin
        .from('account_users').select('account_id').eq('user_id', user.id).single()

      if (auData?.account_id) {
        const { data: account } = await admin
          .from('accounts').select('brand_primary_color').eq('id', auData.account_id).single()
        primaryColor = account?.brand_primary_color || '#0C2C68'
      }
    }
  } catch {}

  return <PhoneClient initialColor={primaryColor} />
}
