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

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const conversations = new Map<string, ConversationMessage[]>()

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let callUuid: string, callerNumber: string, action: string = 'speak'
    let audioBuffer: ArrayBuffer | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      callUuid = formData.get('call_uuid') as string
      callerNumber = formData.get('caller_id_number') as string || 'Unknown'
      action = formData.get('action') as string || 'speak'
      const audioFile = formData.get('audio') as File | null
      if (audioFile && audioFile.size > 0) {
        audioBuffer = await audioFile.arrayBuffer()
        console.log(`[Receptionist] Received audio: ${audioFile.size} bytes`)
      }
    } else {
      const body = await req.json()
      callUuid = body.call_uuid
      callerNumber = body.caller_id_number || 'Unknown'
      action = body.action || 'speak'
      if (body.audio_b64) {
        audioBuffer = Buffer.from(body.audio_b64, 'base64').buffer as ArrayBuffer
      }
    }

    console.log(`[Receptionist] ${callUuid} | action: ${action} | audio: ${audioBuffer?.byteLength ?? 0} bytes`)

    if (action === 'end') {
      const conversation = conversations.get(callUuid) || []
      const summary = await generateCallSummary(conversation)
      await saveCallTranscript(callUuid, '', callerNumber, conversation, summary)
      conversations.delete(callUuid)
      return NextResponse.json({ success: true, summary })
    }

    if (!conversations.has(callUuid)) conversations.set(callUuid, [])
    const conversation = conversations.get(callUuid)!
    const config = await getActiveReceptionistConfig()
    if (!config) throw new Error('No config')

    if (action === 'greet') {
      const audio = await textToSpeech(config.greeting_text)
      conversation.push({ role: 'assistant', content: config.greeting_text })
      return NextResponse.json({
        success: true,
        ai_response: config.greeting_text,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    if (action === 'silence') {
      const msg = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({
        success: true,
        ai_response: msg,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    // Process caller audio
    if (!audioBuffer || audioBuffer.byteLength < 1000) {
      console.log(`[Receptionist] Audio too small: ${audioBuffer?.byteLength ?? 0} bytes`)
      const msg = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({
        success: true,
        ai_response: msg,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    const transcript = await transcribeAudio(audioBuffer)
    console.log(`[Receptionist] ${callUuid} | Transcript: "${transcript}"`)

    if (!transcript.trim()) {
      const msg = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({
        success: true,
        transcript: '',
        ai_response: msg,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    conversation.push({ role: 'user', content: transcript })
    const aiResponse = await generateAIResponse(conversation, config)
    console.log(`[Receptionist] ${callUuid} | AI: "${aiResponse}"`)
    conversation.push({ role: 'assistant', content: aiResponse })

    const responseAudio = await textToSpeech(aiResponse)

    return NextResponse.json({
      success: true,
      transcript,
      ai_response: aiResponse,
      audio_b64: Buffer.from(responseAudio).toString('base64'),
    })

  } catch (error: any) {
    console.error('[Receptionist] Error:', error?.message || error)
    return NextResponse.json({ error: 'Processing failed', detail: error?.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const callUuid = searchParams.get('call_uuid')
  if (!callUuid) return NextResponse.json({ active_calls: conversations.size })
  const conversation = conversations.get(callUuid) || []
  return NextResponse.json({ call_uuid: callUuid, conversation })
}
