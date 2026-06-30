import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VM_API = process.env.VOICEMAIL_API_URL || 'http://198.58.114.103:8088'
const VM_SECRET = process.env.VOICEMAIL_API_SECRET || ''

async function provisionOnFreeswitch(payload: {
  sip_domain: string
  extension_number: string
  sip_password: string
  display_name: string
  caller_id_number: string
}) {
  try {
    const res = await fetch(`${VM_API}/api/provision-extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Auth': VM_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.admin_password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (body.action === 'create') {
      // 1. Get the account's SIP domain
      const { data: account } = await supabaseAdmin
        .from('accounts').select('sip_domain, name').eq('id', body.account_id).single()

      if (!account?.sip_domain) {
        return NextResponse.json({ error: 'Account has no SIP domain configured' }, { status: 400 })
      }

      // 2. Create the DB record
      const { error } = await supabaseAdmin.from('extensions').insert([{
        account_id: body.account_id, extension_number: body.extension_number,
        display_name: body.display_name, sip_password: body.sip_password,
        email: body.email, active: true,
      }])
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      // 3. Provision on FreeSWITCH automatically
      const provision = await provisionOnFreeswitch({
        sip_domain: account.sip_domain,
        extension_number: body.extension_number,
        sip_password: body.sip_password,
        display_name: body.display_name || `Ext ${body.extension_number}`,
        caller_id_number: body.caller_id_number || '',
      })

      if (!provision.ok) {
        return NextResponse.json({
          success: true,
          warning: `Saved to database but FreeSWITCH provisioning failed: ${provision.error}. The extension may not be able to register until this is fixed manually.`
        })
      }

      return NextResponse.json({ success: true, provisioned: true })
    }

    if (body.action === 'toggle') {
      const { error } = await supabaseAdmin.from('extensions').update({ active: body.active }).eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'delete') {
      const { error } = await supabaseAdmin.from('extensions').delete().eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
