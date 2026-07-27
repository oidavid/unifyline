import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface ConversationMessage { role: 'user' | 'assistant'; content: string }
export interface ReceptionistConfig {
  system_prompt: string
  greeting_text: string
  knowledge_base: string
  active: boolean
  tenant_account_id?: string | null
  mode?: string
}

async function getConfigByDidOverride(didNumber: string): Promise<ReceptionistConfig | null> {
  const normalizedDid = didNumber.replace(/\D/g, '').replace(/^1/, '')
  const { data } = await supabase
    .from('did_receptionist_config')
    .select('*')
    .eq('did_number', normalizedDid)
    .eq('active', true)
    .single()

  if (!data) return null

  let knowledgeBase = data.knowledge_base || ''
  if (!knowledgeBase && data.account_id) {
    const { data: accountConfig } = await supabase
      .from('ai_receptionist_config')
      .select('knowledge_base')
      .eq('tenant_account_id', data.account_id)
      .single()
    knowledgeBase = accountConfig?.knowledge_base || ''
  }

  return {
    system_prompt: data.system_prompt,
    greeting_text: data.greeting_text,
    knowledge_base: knowledgeBase,
    active: data.active,
    tenant_account_id: data.account_id,
    mode: data.mode,
  }
}

async function getConfigByDid(didNumber: string): Promise<ReceptionistConfig | null> {
  const normalizedDid = didNumber.replace(/\D/g, '').replace(/^1/, '')
  const { data: phoneRow } = await supabase
    .from('account_phone_numbers')
    .select('account_id')
    .eq('did_number', normalizedDid)
    .single()

  if (!phoneRow?.account_id) return null

  const { data: configRow } = await supabase
    .from('ai_receptionist_config')
    .select('*')
    .eq('tenant_account_id', phoneRow.account_id)
    .eq('active', true)
    .limit(1)
    .single()

  return configRow || null
}

export async function getActiveReceptionistConfig(didNumber?: string): Promise<ReceptionistConfig | null> {
  if (didNumber) {
    const didOverride = await getConfigByDidOverride(didNumber)
    if (didOverride) return didOverride

    const tenantConfig = await getConfigByDid(didNumber)
    if (tenantConfig) return tenantConfig
  }

  const { data, error } = await supabase.from('ai_receptionist_config').select('*').eq('active', true).limit(1).single()
  if (error || !data) {
    return {
      system_prompt: `You are a professional AI receptionist. Your job is to greet callers, find out what they need, answer questions, and take messages.

CRITICAL RULES:
- Keep ALL responses under 2 sentences - this is a phone call
- NEVER say you are transferring or connecting anyone - you cannot do that
- NEVER say please hold - you cannot do that
- If someone asks for a specific person: say they are unavailable and offer to take a message
- If someone asks for a department: say you will pass a message to that team
- IMPORTANT: You already have the caller phone number from their caller ID. NEVER ask for their phone number.
- When confirming a callback number, say: 'Should we call you back on the number you are calling from?'
- Only ask for the caller's NAME, not their phone number
- Before ending: confirm their name and let them know someone will follow up`,
      greeting_text: 'Thank you for calling. This is the AI receptionist. How may I help you today?',
      knowledge_base: '',
      active: true,
    }
  }
  return data
}

export async function getDefaultAccountId(didNumber?: string): Promise<string | null> {
  if (didNumber) {
    const normalizedDid = didNumber.replace(/\D/g, '').replace(/^1/, '')
    const { data: phoneRow } = await supabase
      .from('account_phone_numbers')
      .select('account_id')
      .eq('did_number', normalizedDid)
      .single()
    if (phoneRow?.account_id) return phoneRow.account_id
  }

  const { data } = await supabase.from('ai_receptionist_config').select('account_id').eq('active', true).limit(1).single()
  return data?.account_id || null
}

export async function generateAIResponse(conversation: ConversationMessage[], config: ReceptionistConfig): Promise<string> {
  const systemPrompt = `${config.system_prompt}

${config.knowledge_base ? `BUSINESS INFORMATION:\n${config.knowledge_base}` : ''}

CRITICAL: You are on a PHONE CALL. Maximum 2 short sentences per response. Natural spoken language only. No bullet points. No offers to transfer or hold.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    system: systemPrompt,
    messages: conversation,
  })
  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text : "I'm sorry, could you repeat that?"
}

export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=8000&container=wav', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!response.ok) throw new Error(`Deepgram TTS failed: ${response.statusText}`)
  return response.arrayBuffer()
}

export async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true', {
    method: 'POST',
    headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'audio/wav' },
    body: audioBuffer,
  })
  if (!response.ok) throw new Error(`Deepgram STT failed: ${response.statusText}`)
  const data = await response.json()
  return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
}

export async function saveCallTranscript(
  callUuid: string,
  accountId: string,
  callerNumber: string,
  conversation: ConversationMessage[],
  summary: string
) {
  let finalAccountId = accountId
  if (!finalAccountId) {
    finalAccountId = await getDefaultAccountId() || ''
  }

  await supabase.from('call_detail_records').upsert({
    call_uuid: callUuid,
    account_id: finalAccountId,
    direction: 'inbound',
    from_number: callerNumber,
    to_number: 'AI Receptionist',
    status: 'completed',
    duration_sec: Math.floor(conversation.length * 8),
    ai_transcript: JSON.stringify(conversation),
    ai_summary: summary,
  })
}

export async function generateCallSummary(conversation: ConversationMessage[]): Promise<string> {
  if (conversation.length === 0) return 'No conversation recorded.'
  const transcriptText = conversation.map(m => `${m.role === 'user' ? 'Caller' : 'AI'}: ${m.content}`).join('\n')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{ role: 'user', content: `Summarize this phone call in 2-3 sentences. Who called, what did they need, what action is required?\n\n${transcriptText}` }],
  })
  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text : 'Call completed.'
}

// Short, spoken briefing for a live human agent about to be connected to a
// caller via a warm transfer - played privately to the agent before the two
// legs are bridged together. Kept intentionally brief (under ~4 seconds of
// speech) since the caller may be waiting in near-silence while this plays.
export async function generateTransferBrief(conversation: ConversationMessage[], department: string): Promise<string> {
  if (conversation.length === 0) return `Incoming transfer for ${department || 'your team'}.`
  const transcriptText = conversation.map(m => `${m.role === 'user' ? 'Caller' : 'AI'}: ${m.content}`).join('\n')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 60,
    messages: [{
      role: 'user',
      content: `You are briefing a live human agent who is about to be connected to a phone caller. Based on this conversation, write ONE short natural spoken sentence (under 15 words) briefing the agent - caller's name if known, what they need, and urgency if relevant. No greetings, no "say hello" instructions - just the briefing itself, ready to be spoken aloud.\n\nDepartment: ${department || 'general'}\n\n${transcriptText}`
    }],
  })
  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text.trim() : `Incoming transfer for ${department || 'your team'}.`
}