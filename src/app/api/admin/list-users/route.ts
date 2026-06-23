import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { admin_password } = await req.json()
    if (admin_password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Get all account_users links
    const { data: auData } = await supabaseAdmin
      .from('account_users')
      .select('user_id, account_id, role, accounts(name), extensions(extension_number, display_name)')

    // Get all extensions for assignment dropdown
    const { data: extData } = await supabaseAdmin
      .from('extensions')
      .select('id, extension_number, display_name, account_id, user_id, accounts(name)')
      .order('extension_number')

    // Merge auth users with their account links
    const users = authData.users.map(u => {
      const link = (auData || []).find((a: any) => a.user_id === u.id)
      return {
        id:           u.id,
        email:        u.email,
        created_at:   u.created_at,
        last_sign_in: u.last_sign_in_at,
        account_id:   link?.account_id || null,
        account_name: (link as any)?.accounts?.name || null,
        extension:    (link as any)?.extensions?.extension_number || null,
        display_name: (link as any)?.extensions?.display_name || null,
        role:         link?.role || null,
        linked:       !!link,
      }
    })

    return NextResponse.json({ users, extensions: extData || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
