import { NextRequest, NextResponse } from 'next/server'
import { getActiveReceptionistConfig, textToSpeech } from '@/lib/receptionist'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { call_uuid, caller_id_number } = body
    console.log(`[Receptionist] Inbound call: ${call_uuid} from ${caller_id_number}`)

    const config = await getActiveReceptionistConfig()
    if (!config) return NextResponse.json({ error: 'No receptionist configured' }, { status: 404 })

    const greetingAudio = await textToSpeech(config.greeting_text)

    return NextResponse.json({
      success: true,
      call_uuid,
      greeting_text: config.greeting_text,
      greeting_audio_b64: Buffer.from(greetingAudio).toString('base64'),
      session_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/receptionist/respond`,
    })
  } catch (error) {
    console.error('[Receptionist] Inbound error:', error)
    return NextResponse.json({ error: 'Receptionist failed' }, { status: 500 })
  }
}

export async function GET() {
  const config = await getActiveReceptionistConfig()
  return NextResponse.json({ active: !!config, greeting: config?.greeting_text })
}
