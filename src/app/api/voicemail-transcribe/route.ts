import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const VM_API = process.env.VOICEMAIL_API_URL || 'http://198.58.114.103:8088'
const VM_SECRET = process.env.VOICEMAIL_API_SECRET || ''
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path: filePath } = await req.json()
    if (!filePath) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    // Send to FreeSWITCH sidecar which handles the actual Deepgram call
    const res = await fetch(`${VM_API}/api/transcribe-voicemail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Auth': VM_SECRET,
      },
      body: JSON.stringify({ path: filePath, deepgram_key: DEEPGRAM_KEY }),
      signal: AbortSignal.timeout(35000), // Deepgram needs up to 30s for longer voicemails
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ transcript: data.transcript || '' })
  } catch (e: any) {
    console.error('[voicemail-transcribe]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
