import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveReceptionistConfig,
  generateAIResponse,
  textToSpeech,
  transcribeAudio,
  saveCallTranscript,
  generateCallSummary,
  ConversationMessage,
} from '@/lib/receptionist'

const conversations = new Map<string, ConversationMessage[]>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { call_uuid, caller_id_number, action, audio_b64 } = body
    const callerNumber = caller_id_number || 'Unknown'

    console.log(`[Receptionist] ${call_uuid} | action: ${action || 'speak'}`)

    // Handle call end
    if (action === 'end') {
      const conversation = conversations.get(call_uuid) || []
      const summary = await generateCallSummary(conversation)
      await saveCallTranscript(call_uuid, '', callerNumber, conversation, summary)
      conversations.delete(call_uuid)
      return NextResponse.json({ success: true, summary })
    }

    // Get or init conversation
    if (!conversations.has(call_uuid)) conversations.set(call_uuid, [])
    const conversation = conversations.get(call_uuid)!

    const config = await getActiveReceptionistConfig()
    if (!config) throw new Error('No config')

    // Handle greeting (first turn)
    if (action === 'greet') {
      const audio = await textToSpeech(config.greeting_text)
      conversation.push({ role: 'assistant', content: config.greeting_text })
      return NextResponse.json({
        success: true,
        ai_response: config.greeting_text,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    // Handle silence
    if (action === 'silence') {
      const silenceResponse = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(silenceResponse)
      return NextResponse.json({
        success: true,
        ai_response: silenceResponse,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    // Handle caller audio - transcribe and respond
    if (!audio_b64) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    const audioBuffer = Buffer.from(audio_b64, 'base64').buffer as ArrayBuffer
    const transcript = await transcribeAudio(audioBuffer)
    console.log(`[Receptionist] ${call_uuid} | Caller: "${transcript}"`)

    if (!transcript.trim()) {
      const silenceResponse = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(silenceResponse)
      return NextResponse.json({
        success: true,
        transcript: '',
        ai_response: silenceResponse,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    conversation.push({ role: 'user', content: transcript })
    const aiResponse = await generateAIResponse(conversation, config)
    console.log(`[Receptionist] ${call_uuid} | AI: "${aiResponse}"`)
    conversation.push({ role: 'assistant', content: aiResponse })

    const responseAudio = await textToSpeech(aiResponse)

    return NextResponse.json({
      success: true,
      transcript,
      ai_response: aiResponse,
      audio_b64: Buffer.from(responseAudio).toString('base64'),
    })

  } catch (error) {
    console.error('[Receptionist] Error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const callUuid = searchParams.get('call_uuid')
  if (!callUuid) return NextResponse.json({ active_calls: conversations.size })
  const conversation = conversations.get(callUuid) || []
  return NextResponse.json({ call_uuid: callUuid, conversation })
}
