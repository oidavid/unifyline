import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, string> = {}
  
  // Check env vars exist
  results.has_deepgram_key = process.env.DEEPGRAM_API_KEY ? `yes (starts with ${process.env.DEEPGRAM_API_KEY.substring(0,8)})` : 'MISSING'
  results.has_anthropic_key = process.env.ANTHROPIC_API_KEY ? `yes (starts with ${process.env.ANTHROPIC_API_KEY.substring(0,8)})` : 'MISSING'
  results.has_supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'yes' : 'MISSING'

  // Test Deepgram TTS
  try {
    const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Hello' }),
    })
    results.deepgram_tts_status = `${response.status} ${response.statusText}`
    if (!response.ok) {
      const text = await response.text()
      results.deepgram_tts_error = text
    } else {
      const buf = await response.arrayBuffer()
      results.deepgram_tts_bytes = String(buf.byteLength)
    }
  } catch (e: any) {
    results.deepgram_tts_exception = e.message
  }

  return NextResponse.json(results)
}
