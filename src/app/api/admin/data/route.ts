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

    // Fetch everything the admin portal needs in one request
    const [accountsRes, extensionsRes, callsRes, authUsersRes, accountUsersRes, leadsRes] = await Promise.all([
      supabaseAdmin.from('accounts').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('extensions').select('*, accounts(name)').order('extension_number'),
      supabaseAdmin.from('call_detail_records').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.auth.admin.listUsers(),
      supabaseAdmin.from('account_users').select('*, accounts(name), extensions(extension_number, display_name)').order('created_at', { ascending: false }),
      supabaseAdmin.from('intake_leads').select('*').order('created_at', { ascending: false }),
    ])

    const accounts = accountsRes.data || []
    const extensions = (extensionsRes.data || []).map((e: any) => ({ ...e, account_name: e.accounts?.name }))
    const calls = callsRes.data || []
    const accountUsers = accountUsersRes.data || []

    // Merge auth users with account links
    const authUsers = (authUsersRes.data?.users || []).map((u: any) => {
      const link = accountUsers.find((a: any) => a.user_id === u.id)
      return {
        id:           u.id,
        email:        u.email,
        created_at:   u.created_at,
        last_sign_in: u.last_sign_in_at,
        account_id:   (link as any)?.account_id || null,
        account_name: (link as any)?.accounts?.name || null,
        extension:    (link as any)?.extensions?.extension_number || null,
        display_name: (link as any)?.extensions?.display_name || null,
        role:         (link as any)?.role || null,
        linked:       !!link,
      }
    })

    return NextResponse.json({ accounts, extensions, calls, authUsers, leads: leadsRes.data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
