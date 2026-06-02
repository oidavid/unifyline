import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveReceptionistConfig,
  generateAIResponse,
  textToSpeech,
  transcribeAudio,
  saveCallTranscript,
  generateCallSummary,
  getDefaultAccountId,
  ConversationMessage,
} from '@/lib/receptionist'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getConversation(callUuid: string): Promise<ConversationMessage[]> {
  const { data } = await supabase
    .from('call_sessions')
    .select('conversation')
    .eq('call_uuid', callUuid)
    .single()
  if (!data) return []
  try { return JSON.parse(data.conversation) } catch { return [] }
}

async function saveConversation(callUuid: string, callerNumber: string, conversation: ConversationMessage[]) {
  await supabase.from('call_sessions').upsert({
    call_uuid: callUuid,
    caller_number: callerNumber,
    conversation: JSON.stringify(conversation),
    updated_at: new Date().toISOString(),
  })
}

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

    const config = await getActiveReceptionistConfig()
    if (!config) throw new Error('No config')

    // Handle call end - save to CDR
    if (action === 'end') {
      const conversation = await getConversation(callUuid)
      const summary = conversation.length > 0
        ? await generateCallSummary(conversation)
        : 'Call ended with no conversation recorded.'

      const accountId = await getDefaultAccountId() || ''
      await supabase.from('call_detail_records').upsert({
        call_uuid: callUuid,
        account_id: accountId,
        direction: 'inbound',
        from_number: callerNumber,
        to_number: 'AI Receptionist',
        status: 'completed',
        duration_sec: Math.floor(conversation.length * 8),
        ai_transcript: JSON.stringify(conversation),
        ai_summary: summary,
      })

      // Clean up session
      await supabase.from('call_sessions').delete().eq('call_uuid', callUuid)
      console.log(`[Receptionist] Saved CDR for ${callUuid} | Summary: ${summary}`)
      return NextResponse.json({ success: true, summary })
    }

    // Handle greeting
    if (action === 'greet') {
      const audio = await textToSpeech(config.greeting_text)
      // Inject caller ID context so AI knows the number without asking
      const systemNote = `CALLER INFO: The caller phone number is ${callerNumber}. Do not ask for it. If they want a callback, confirm this number.`
      const conversation: ConversationMessage[] = [
        { role: 'user', content: systemNote },
        { role: 'assistant', content: config.greeting_text }
      ]
      await saveConversation(callUuid, callerNumber, conversation)
      return NextResponse.json({
        success: true,
        ai_response: config.greeting_text,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }

    // Handle silence
    if (action === 'silence') {
      const msg = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({
        success: true,
        ai_response: msg,
        audio_b64: Buffer.from(audio).toString('base64'),
      })
    }


    // Handle callback prompt - announce caller ID and ask to confirm
    if (action === 'callback_prompt') {
      const cbNumber = body.callback_number || callerNumber
      const formatted = cbNumber.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
      const msg = `I have your callback number as ${formatted}. Press 1 to confirm that number, or press 2 to enter a different number.`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    // Handle callback confirmed
    if (action === 'callback_confirmed') {
      const cbNumber = body.callback_number || callerNumber
      const formatted = cbNumber.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
      const msg = `Perfect. We will call you back at ${formatted}. Thank you for calling and have a great day!`
      const audio = await textToSpeech(msg)
      // Save callback number to conversation
      const conversation = await getConversation(callUuid)
      conversation.push({ role: 'assistant', content: `Callback number confirmed: ${cbNumber}` })
      await saveConversation(callUuid, callerNumber, conversation)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    // Handle request for alternate number
    if (action === 'request_alternate') {
      const msg = `Please enter your 10-digit callback number now, followed by the pound sign.`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    // Handle number readback for confirmation
    if (action === 'readback_number') {
      const cbNumber = body.callback_number || callerNumber
      const digits = cbNumber.split('').join(', ')
      const msg = `I have ${digits}. Press 1 if that is correct, or press 2 to try again.`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    // Process caller audio
    if (!audioBuffer || audioBuffer.byteLength < 1000) {
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

    // Load conversation from Supabase, add user message, get AI response
    const conversation = await getConversation(callUuid)
    conversation.push({ role: 'user', content: transcript })

    const aiResponse = await generateAIResponse(conversation, config)
    console.log(`[Receptionist] ${callUuid} | AI: "${aiResponse}"`)
    conversation.push({ role: 'assistant', content: aiResponse })

    // Save updated conversation to Supabase
    await saveConversation(callUuid, callerNumber, conversation)

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
  if (!callUuid) return NextResponse.json({ active_calls: 0 })
  const conversation = await getConversation(callUuid)
  return NextResponse.json({ call_uuid: callUuid, conversation })
}




