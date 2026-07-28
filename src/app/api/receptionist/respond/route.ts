import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveReceptionistConfig,
  generateAIResponse,
  textToSpeech,
  transcribeAudio,
  generateCallSummary,
  generateTransferBrief,
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

const TRANSFER_TAG_RE = /\[\[TRANSFER:(\w+)\]\]/i

function extractTransfer(aiResponse: string): { cleanText: string; department: string } {
  const match = aiResponse.match(TRANSFER_TAG_RE)
  if (!match) return { cleanText: aiResponse, department: '' }
  const department = match[1].toLowerCase()
  const cleanText = aiResponse.replace(TRANSFER_TAG_RE, '').replace(/\s{2,}/g, ' ').trim()
  return { cleanText, department }
}

async function getConversation(callUuid: string): Promise<ConversationMessage[]> {
  try {
    const { data } = await supabase
      .from('call_sessions')
      .select('conversation')
      .eq('call_uuid', callUuid)
      .single()
    if (!data?.conversation) return []
    return JSON.parse(data.conversation)
  } catch { return [] }
}

async function saveConversation(callUuid: string, callerNumber: string, conversation: ConversationMessage[]) {
  try {
    await supabase.from('call_sessions').upsert({
      call_uuid: callUuid,
      caller_number: callerNumber,
      conversation: JSON.stringify(conversation),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'call_uuid' })
  } catch (e) { console.error('[Session save error]', e) }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let callUuid = '', callerNumber = 'Unknown', action = 'speak'
    let audioBuffer: ArrayBuffer | null = null
    let callbackNumber = '', sayText = '', callerName = '', callReason = '', destinationNumber = '', department = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      callUuid = formData.get('call_uuid') as string || ''
      callerNumber = formData.get('caller_id_number') as string || 'Unknown'
      action = formData.get('action') as string || 'speak'
      callbackNumber = formData.get('callback_number') as string || ''
      sayText = formData.get('text') as string || ''
      destinationNumber = formData.get('destination_number') as string || ''
      const audioFile = formData.get('audio') as File | null
      if (audioFile && audioFile.size > 0) audioBuffer = await audioFile.arrayBuffer()
    } else {
      const body = await req.json()
      callUuid = body.call_uuid || ''
      callerNumber = body.caller_id_number || 'Unknown'
      action = body.action || 'speak'
      callbackNumber = body.callback_number || ''
      sayText = body.text || ''
      callerName = body.caller_name || ''
      callReason = body.reason || ''
      destinationNumber = body.destination_number || ''
      department = body.department || ''
      ;(req as any)._actualDurationSec = body.actual_duration_sec || 0
      ;(req as any)._wasTransferred = body.was_transferred === true || body.was_transferred === 'true'
      if (body.audio_b64) audioBuffer = Buffer.from(body.audio_b64, 'base64').buffer as ArrayBuffer
    }

    console.log(`[API] ${callUuid} action=${action} caller=${callerNumber} did=${destinationNumber}`)

    const config = await getActiveReceptionistConfig(destinationNumber || undefined)
    if (!config) throw new Error('No receptionist config found')

    if (action === 'greet') {
      const audio = await textToSpeech(config.greeting_text)
      const systemNote = `CALLER INFO: The caller phone number is ${callerNumber}. Do not ask for it. If they want a callback, confirm this number.`
      const conversation: ConversationMessage[] = [
        { role: 'user', content: systemNote },
        { role: 'assistant', content: config.greeting_text }
      ]
      await saveConversation(callUuid, callerNumber, conversation)
      return NextResponse.json({
        success: true,
        ai_response: config.greeting_text,
        audio_b64: Buffer.from(audio).toString('base64')
      })
    }

    if (action === 'say') {
      const text = sayText || 'Hello'
      const audio = await textToSpeech(text)
      return NextResponse.json({
        success: true,
        ai_response: text,
        audio_b64: Buffer.from(audio).toString('base64')
      })
    }

    if (action === 'transfer_brief') {
      const conversation = await getConversation(callUuid)
      const brief = await generateTransferBrief(conversation, department)
      const audio = await textToSpeech(brief)
      console.log(`[transfer_brief] ${callUuid} dept=${department}: "${brief}"`)
      return NextResponse.json({ success: true, brief_text: brief, audio_b64: Buffer.from(audio).toString('base64') })
    }

    if (action === 'on_call_lookup') {
      const normalizedCaller = callerNumber.replace(/\D/g, '').replace(/^1/, '')
      const accountId = await getDefaultAccountId(destinationNumber || undefined)

      if (!accountId) {
        return NextResponse.json({ success: true, on_call_number: '' })
      }

      async function pickFrom(deptFilter: string | null) {
        let query = supabase
          .from('on_call_schedule')
          .select('phone_number, priority')
          .eq('account_id', accountId as string)
          .eq('active', true)
          .order('priority', { ascending: true })

        query = deptFilter === null ? query.is('department', null) : query.eq('department', deptFilter)

        const { data: rows } = await query
        for (const row of rows || []) {
          const normalizedRow = (row.phone_number || '').replace(/\D/g, '').replace(/^1/, '')
          if (normalizedRow && normalizedRow !== normalizedCaller) return row.phone_number
        }
        return ''
      }

      let chosen = ''
      const dept = (department || '').toLowerCase().trim()
      if (dept && dept !== 'general') {
        chosen = await pickFrom(dept)
      }
      if (!chosen) {
        chosen = await pickFrom(null)
      }

      console.log(`[on_call_lookup] account=${accountId} dept=${dept || '(none)'} caller=${callerNumber} -> chosen=${chosen}`)
      return NextResponse.json({ success: true, on_call_number: chosen })
    }

    if (action === 'transcribe_only') {
      if (!audioBuffer || audioBuffer.byteLength < 1000) {
        return NextResponse.json({ success: true, transcript: '' })
      }
      const transcript = await transcribeAudio(audioBuffer)
      return NextResponse.json({ success: true, transcript })
    }

    if (action === 'silence') {
      const msg = "I'm sorry, I didn't catch that. Could you please say that again?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({
        success: true,
        ai_response: msg,
        audio_b64: Buffer.from(audio).toString('base64')
      })
    }

    if (action === 'callback_prompt') {
      const num = callbackNumber || callerNumber
      const fmt = num.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
      const msg = `Should we call you back at ${fmt}? Press 1 to confirm, or press 2 to enter a different number.`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    if (action === 'callback_confirmed') {
      const num = callbackNumber || callerNumber
      const fmt = num.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
      const msg = `Perfect. We will have someone call you back at ${fmt} as soon as possible. Thank you for calling and have a wonderful day!`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    if (action === 'request_alternate') {
      const msg = `Please enter your 10-digit callback number followed by the pound key.`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    if (action === 'readback_number') {
      const num = callbackNumber || callerNumber
      const digits = num.replace(/\D/g, '').split('').join(', ')
      const msg = `I have ${digits}. Press 1 to confirm or press 2 to try again.`
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    if (action === 'end') {
      const accountId = await getDefaultAccountId(destinationNumber || undefined) || ''
      const conversation = await getConversation(callUuid)

      let summary = ''
      if (conversation.length > 2) {
        summary = await generateCallSummary(conversation)
      } else {
        const cb = callbackNumber || callerNumber
        summary = `Inbound call from ${callerNumber}. Callback: ${cb}.`
      }

      console.log(`[End] ${callUuid} summary: ${summary}`)

      // Cost estimate - APPROXIMATE, not billing-grade. See COST_MODEL_NOTES
      // below for assumptions and known limitations.
      const actualDurationSec = (req as any)._actualDurationSec ?? 0
      const wasTransferred = (req as any)._wasTransferred ?? false
      const durationMin = actualDurationSec > 0 ? actualDurationSec / 60 : Math.max(conversation.length * 15, 30) / 60

      const TWILIO_INBOUND_PER_MIN = 0.0085
      const TWILIO_OUTBOUND_PER_MIN = 0.014
      const DEEPGRAM_STT_PER_MIN = 0.006
      const DEEPGRAM_TTS_PER_1K_CHARS = 0.02
      const CLAUDE_SONNET_INPUT_PER_MTOK = 3.0
      const CLAUDE_SONNET_OUTPUT_PER_MTOK = 15.0
      const CHARS_PER_TOKEN_ESTIMATE = 4

      const assistantText = conversation.filter(m => m.role === 'assistant').map(m => m.content).join(' ')
      const userText = conversation.filter(m => m.role === 'user').map(m => m.content).join(' ')
      const assistantChars = assistantText.length
      const estInputTokens = Math.ceil((userText.length + assistantChars) / CHARS_PER_TOKEN_ESTIMATE)
      const estOutputTokens = Math.ceil(assistantChars / CHARS_PER_TOKEN_ESTIMATE)

      // Telephony: inbound leg bills for the whole call; if transferred, the
      // outbound leg ALSO bills, approximated here across the full duration
      // (an upper-bound estimate - the bridged portion is actually shorter
      // than the full call, so real telephony cost is likely somewhat lower
      // than this when a transfer happens).
      const telephonyCost = durationMin * TWILIO_INBOUND_PER_MIN + (wasTransferred ? durationMin * TWILIO_OUTBOUND_PER_MIN : 0)
      const sttCost = durationMin * DEEPGRAM_STT_PER_MIN
      const ttsCost = (assistantChars / 1000) * DEEPGRAM_TTS_PER_1K_CHARS
      const llmCost = (estInputTokens / 1_000_000) * CLAUDE_SONNET_INPUT_PER_MTOK + (estOutputTokens / 1_000_000) * CLAUDE_SONNET_OUTPUT_PER_MTOK

      const estimatedCostUsd = Number((telephonyCost + sttCost + ttsCost + llmCost).toFixed(5))

      await supabase.from('call_detail_records').upsert({
        call_uuid: callUuid,
        account_id: accountId,
        direction: 'inbound',
        from_number: callerNumber,
        to_number: 'AI Receptionist',
        status: 'completed',
        duration_sec: Math.max(conversation.length * 15, 30),
        actual_duration_sec: actualDurationSec > 0 ? actualDurationSec : null,
        was_transferred: wasTransferred,
        estimated_cost_usd: estimatedCostUsd,
        ai_transcript: JSON.stringify(conversation),
        ai_summary: summary,
      }, { onConflict: 'call_uuid' })

      await supabase.from('call_sessions').delete().eq('call_uuid', callUuid)
      return NextResponse.json({ success: true, summary, account_id: accountId, estimated_cost_usd: estimatedCostUsd })
    }

    if (!audioBuffer || audioBuffer.byteLength < 1000) {
      const msg = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    const transcript = await transcribeAudio(audioBuffer)
    console.log(`[STT] ${callUuid}: "${transcript}"`)

    if (!transcript.trim()) {
      const msg = "I'm sorry, I didn't catch that. Could you please repeat?"
      const audio = await textToSpeech(msg)
      return NextResponse.json({ success: true, transcript: '', ai_response: msg, audio_b64: Buffer.from(audio).toString('base64') })
    }

    const conversation = await getConversation(callUuid)
    conversation.push({ role: 'user', content: transcript })

    const rawAiResponse = await generateAIResponse(conversation, config)
    const { cleanText: aiResponse, department: transferDepartment } = extractTransfer(rawAiResponse)

    console.log(`[AI] ${callUuid}: "${aiResponse}"${transferDepartment ? ` [TRANSFER:${transferDepartment}]` : ''}`)
    conversation.push({ role: 'assistant', content: aiResponse })

    await saveConversation(callUuid, callerNumber, conversation)

    const audio = await textToSpeech(aiResponse)
    return NextResponse.json({
      success: true,
      transcript,
      ai_response: aiResponse,
      transfer_department: transferDepartment,
      audio_b64: Buffer.from(audio).toString('base64')
    })

  } catch (error: any) {
    console.error('[Receptionist Error]', error?.message || error)
    return NextResponse.json({ error: 'Processing failed', detail: error?.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const callUuid = searchParams.get('call_uuid')
  if (!callUuid) return NextResponse.json({ active_calls: 0 })
  const conversation = await getConversation(callUuid)
  return NextResponse.json({ call_uuid: callUuid, turns: conversation.length, conversation })
}