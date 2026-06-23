import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { admin_password, user_id, account_id, extension_id, role, action } = await req.json()

    if (admin_password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (action === 'unlink') {
      // Remove from account_users
      await supabaseAdmin.from('account_users').delete().eq('user_id', user_id)
      // Clear user_id from any extension
      await supabaseAdmin.from('extensions').update({ user_id: null }).eq('user_id', user_id)
      return NextResponse.json({ success: true, message: 'User unlinked.' })
    }

    if (action === 'link') {
      if (!user_id || !account_id || !extension_id) {
        return NextResponse.json({ error: 'user_id, account_id and extension_id are required' }, { status: 400 })
      }

      // Upsert account_users
      const { error: auError } = await supabaseAdmin
        .from('account_users')
        .upsert([{ user_id, account_id, role: role || 'user' }], { onConflict: 'user_id' })
      if (auError) return NextResponse.json({ error: auError.message }, { status: 400 })

      // Clear previous extension assignment for this user
      await supabaseAdmin.from('extensions').update({ user_id: null }).eq('user_id', user_id)

      // Assign extension to user
      const { error: extError } = await supabaseAdmin
        .from('extensions')
        .update({ user_id })
        .eq('id', extension_id)
      if (extError) return NextResponse.json({ error: extError.message }, { status: 400 })

      return NextResponse.json({ success: true, message: 'User linked to account and extension.' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
