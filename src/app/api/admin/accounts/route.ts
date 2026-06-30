import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VM_API = process.env.VOICEMAIL_API_URL || 'http://198.58.114.103:8088'
const VM_SECRET = process.env.VOICEMAIL_API_SECRET || ''

async function provisionDomain(sip_domain: string) {
  try {
    const res = await fetch(`${VM_API}/api/provision-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Auth': VM_SECRET },
      body: JSON.stringify({ sip_domain }),
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
      const { error } = await supabaseAdmin.from('accounts').insert([{
        name: body.name, slug: body.slug, sip_domain: body.sip_domain,
        brand_primary_color: body.brand_primary_color, status: body.status,
      }])
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      // Auto-provision the SIP domain on FreeSWITCH so extensions can be added immediately after
      const provision = await provisionDomain(body.sip_domain)

      if (!provision.ok) {
        return NextResponse.json({
          success: true,
          warning: `Account created but SIP domain provisioning failed: ${provision.error}. Extensions cannot register until this is fixed manually on the server.`
        })
      }

      return NextResponse.json({ success: true, provisioned: true })
    }

    if (body.action === 'toggle') {
      const { error } = await supabaseAdmin.from('accounts').update({ status: body.status }).eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
