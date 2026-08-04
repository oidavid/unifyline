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
    const didNumber = req.nextUrl.searchParams.get('did_number')
    if (!accountId) return NextResponse.json(null, { status: 400 })

    // Always fetch the list of DID-specific configs for this account so the
    // dashboard can populate the "which line" selector, regardless of which
    // one is currently being edited.
    const { data: didRows } = await admin
      .from('did_receptionist_config')
      .select('did_number, display_name, mode')
      .eq('account_id', accountId)
      .order('did_number', { ascending: true })

    const dids = (didRows || []).map((d: any) => ({
      did_number: d.did_number,
      label: d.display_name || d.did_number,
      mode: d.mode,
    }))

    if (didNumber) {
      // Editing a specific DID's override config
      const { data } = await admin
        .from('did_receptionist_config')
        .select('*')
        .eq('did_number', didNumber)
        .eq('account_id', accountId)
        .single()

      if (!data) return NextResponse.json({ config: null, dids })

      return NextResponse.json({
        config: {
          system_prompt: data.system_prompt || '',
          greeting_text: data.greeting_text || '',
          knowledge_base: data.knowledge_base || '',
          active: data.active ?? true,
        },
        dids,
      })
    }

    // Default: account-level config
    const { data } = await admin
      .from('ai_receptionist_config')
      .select('*')
      .eq('tenant_account_id', accountId)
      .single()

    return NextResponse.json({ config: data || null, dids })
  } catch (e) {
    console.error('[receptionist-config GET]', e)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { account_id, did_number, system_prompt, greeting_text, knowledge_base, active } = body
    if (!account_id) return NextResponse.json({ error: 'Missing account_id' }, { status: 400 })

    if (did_number) {
      // Editing a DID-specific override - verify it belongs to this account
      // first, and only touch prompt/greeting/knowledge_base/active. mode
      // and department are intentionally left untouched here.
      const { data: existing } = await admin
        .from('did_receptionist_config')
        .select('account_id')
        .eq('did_number', did_number)
        .single()

      if (!existing || existing.account_id !== account_id) {
        return NextResponse.json({ error: 'DID not found for this account' }, { status: 404 })
      }

      const { error } = await admin
        .from('did_receptionist_config')
        .update({ system_prompt, greeting_text, knowledge_base, active })
        .eq('did_number', did_number)
        .eq('account_id', account_id)

      if (error) {
        console.error('[receptionist-config POST did]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    // Default: account-level config
    const { data: existing } = await admin
      .from('ai_receptionist_config')
      .select('id')
      .eq('tenant_account_id', account_id)
      .single()

    let error
    if (existing?.id) {
      const result = await admin
        .from('ai_receptionist_config')
        .update({ system_prompt, greeting_text, knowledge_base, active })
        .eq('tenant_account_id', account_id)
      error = result.error
    } else {
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