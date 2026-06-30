import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VM_API = process.env.VOICEMAIL_API_URL || 'http://198.58.114.103:8088'
const VM_SECRET = process.env.VOICEMAIL_API_SECRET || ''

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([], { status: 401 })

    const { data: auData } = await admin
      .from('account_users').select('account_id').eq('user_id', user.id).single()
    if (!auData?.account_id) return NextResponse.json([])

    const { data: exts } = await admin
      .from('extensions')
      .select('extension_number, display_name')
      .eq('account_id', auData.account_id)

    const isMTI = auData.account_id === '5f646bc2-9bf3-47cb-9859-2871d4322e19'
    const domain = isMTI ? 'mti.unifyline.local' : '198.58.114.103'

    const allVoicemails: any[] = []

    for (const ext of (exts || [])) {
      try {
        const res = await fetch(
          `${VM_API}/api/voicemails?domain=${domain}&extension=${ext.extension_number}`,
          { headers: { 'X-Internal-Auth': VM_SECRET }, signal: AbortSignal.timeout(5000) }
        )
        if (res.ok) {
          const messages = await res.json()
          messages.forEach((msg: any) => {
            allVoicemails.push({
              ...msg,
              extension_name: ext.display_name || `Ext ${ext.extension_number}`,
              created_at: new Date(msg.created_at * 1000).toISOString(),
            })
          })
        }
      } catch (e) {
        console.error(`[voicemail] failed for ext ${ext.extension_number}`, e)
      }
    }

    allVoicemails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json(allVoicemails)
  } catch (e: any) {
    console.error('[voicemail GET]', e)
    return NextResponse.json([])
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path } = await req.json()
    const res = await fetch(`${VM_API}/api/voicemail-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Auth': VM_SECRET },
      body: JSON.stringify({ path }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}