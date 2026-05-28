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
    const contentType = req.headers.get('content-type') || ''
    let callUuid: string, callerNumber: string, audioBuffer: ArrayBuffer, action: string = 'speak'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      callUuid = formData.get('call_uuid') as string
      callerNumber = formData.get('caller_id_number') as string || 'Unknown'
      action = formData.get('action') as string || 'speak'
      const audioFile = formData.get('audio') as File
      audioBuffer = await audioFile.arrayBuffer()
    } else {
      const body = await req.json()
      callUuid = body.call_uuid
      callerNumber = body.caller_id_number || 'Unknown'
      action = body.action || 'speak'
      audioBuffer = Buffer.from(body.audio_b64 || '', 'base64').buffer as ArrayBuffer
    }

    if (action === 'end') {
      const conversation = conversations.get(callUuid) || []
      const summary = await generateCallSummary(conversation)
      await saveCallTranscript(callUuid, '', callerNumber, conversation, summary)
      conversations.delete(callUuid)
      return NextResponse.json({ success: true, summary })
    }

    if (!conversations.has(callUuid)) conversations.set(callUuid, [])
    const conversation = conversations.get(callUuid)!

    const transcript = await transcribeAudio(audioBuffer)
    console.log(`[Receptionist] ${callUuid} | Caller: "${transcript}"`)

    if (!transcript.trim()) {
      const silenceResponse = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(silenceResponse)
      return NextResponse.json({ success: true, transcript: '', ai_response: silenceResponse, audio_b64: Buffer.from(audio).toString('base64') })
    }

    conversation.push({ role: 'user', content: transcript })
    const config = await getActiveReceptionistConfig()
    if (!config) throw new Error('No config')

    const aiResponse = await generateAIResponse(conversation, config)
    conversation.push({ role: 'assistant', content: aiResponse })

    const responseAudio = await textToSpeech(aiResponse)

    return NextResponse.json({
      success: true,
      transcript,
      ai_response: aiResponse,
      audio_b64: Buffer.from(responseAudio).toString('base64'),
    })
  } catch (error) {
    console.error('[Receptionist] Respond error:', error)
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
