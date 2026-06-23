import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with SERVICE ROLE key — never expose this client-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { email, account_id, role, display_name, admin_password } = await req.json()

    // Verify the caller is a super admin (same password check as the page)
    if (admin_password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email || !account_id) {
      return NextResponse.json({ error: 'Email and account are required' }, { status: 400 })
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      // User already exists — just link them to the account
      userId = existingUser.id
    } else {
      // Invite new user — sends magic link email
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { display_name, full_name: display_name },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.unifyline.com'}/auth/login`,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      userId = data.user.id
    }

    // Check if already linked to this account
    const { data: existingLink } = await supabaseAdmin
      .from('account_users')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', account_id)
      .single()

    if (existingLink) {
      return NextResponse.json({ error: 'User is already linked to this account' }, { status: 400 })
    }

    // Link user to account
    const { error: linkError } = await supabaseAdmin.from('account_users').insert([{
      user_id: userId,
      account_id,
      role: role || 'user',
    }])

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })

    return NextResponse.json({
      success: true,
      message: existingUser
        ? `Existing user linked to account successfully.`
        : `Invite sent to ${email}. They will receive a magic link to set their password.`,
      user_id: userId,
      was_existing: !!existingUser,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
