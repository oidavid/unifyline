import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(null, { status: 401 })
    const accountId = req.nextUrl.searchParams.get('account_id')
    if (!accountId) return NextResponse.json(null, { status: 400 })
    const { data } = await admin
      .from('ai_receptionist_config')
      .select('*')
      .eq('tenant_account_id', accountId)
      .single()
    return NextResponse.json(data || null)
  } catch (e) {
    return NextResponse.json(null, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { account_id, system_prompt, greeting_text, knowledge_base, active } = body
    if (!account_id) return NextResponse.json({ error: 'Missing account_id' }, { status: 400 })

    // Check if row exists first
    const { data: existing } = await admin
      .from('ai_receptionist_config')
      .select('id')
      .eq('tenant_account_id', account_id)
      .single()

    let error
    if (existing?.id) {
      // Update existing row
      const result = await admin
        .from('ai_receptionist_config')
        .update({ system_prompt, greeting_text, knowledge_base, active })
        .eq('tenant_account_id', account_id)
      error = result.error
    } else {
      // Insert new row
      const result = await admin
        .from('ai_receptionist_config')
        .insert({ tenant_account_id: account_id, system_prompt, greeting_text, knowledge_base, active })
      error = result.error
    }

    if (error) {
      console.error('[receptionist-config POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[receptionist-config POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}