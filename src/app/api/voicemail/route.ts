import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FS_API = 'http://198.58.114.103:8088'

// GET - list voicemails for account
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

    // Fetch voicemail list from FreeSWITCH via ESL HTTP API
    const allVoicemails: any[] = []

    for (const ext of (exts || [])) {
      try {
        const res = await fetch(
          `${FS_API}/api/vm_list?login=${ext.extension_number}@${domain}`,
          { signal: AbortSignal.timeout(3000) }
        )
        if (res.ok) {
          const text = await res.text()
          // Parse FreeSWITCH vm_list output
          const lines = text.trim().split('\n').filter(l => l.includes('.wav'))
          lines.forEach(line => {
            const parts = line.split('|')
            if (parts.length >= 3) {
              allVoicemails.push({
                id: parts[0] || Math.random().toString(36).slice(2),
                path: parts[1] || '',
                created_at: parts[2] || new Date().toISOString(),
                extension: ext.extension_number,
                extension_name: ext.display_name || `Ext ${ext.extension_number}`,
                domain,
                read: parts[3] === 'read',
              })
            }
          })
        }
      } catch {}
    }

    return NextResponse.json(allVoicemails)
  } catch (e: any) {
    console.error('[voicemail GET]', e)
    return NextResponse.json([])
  }
}

// DELETE - delete a voicemail via FreeSWITCH API
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { msgId, extension, domain } = await req.json()

    await fetch(
      `${FS_API}/api/vm_delete?login=${extension}@${domain}&id=${msgId}`,
      { method: 'GET', signal: AbortSignal.timeout(3000) }
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
