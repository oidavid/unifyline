import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ReceptionistConfig {
  system_prompt: string
  greeting_text: string
  knowledge_base: string
  active: boolean
}

export async function getActiveReceptionistConfig(): Promise<ReceptionistConfig | null> {
  const { data, error } = await supabase
    .from('ai_receptionist_config')
    .select('*')
    .eq('active', true)
    .limit(1)
    .single()

  if (error || !data) {
    return {
      system_prompt: 'You are a professional AI receptionist. Greet callers warmly, answer questions, and help them reach the right person. Keep responses concise and natural for voice conversations - no more than 2-3 sentences per response.',
      greeting_text: 'Thank you for calling. How can I help you today?',
      knowledge_base: '',
      active: true,
    }
  }
  return data
}

export async function generateAIResponse(
  conversation: ConversationMessage[],
  config: ReceptionistConfig
): Promise<string> {
  const systemPrompt = `${config.system_prompt}

${config.knowledge_base ? `Business Information:\n${config.knowledge_base}` : ''}

IMPORTANT: You are speaking via phone. Keep all responses to 1-3 short sentences maximum. Be natural, warm, and conversational. Never use bullet points or lists.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: conversation,
  })

  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text : "I'm sorry, could you repeat that?"
}

export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=8000&container=wav', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) throw new Error(`Deepgram TTS failed: ${response.statusText}`)
  return response.arrayBuffer()
}

export async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string = 'audio/wav'): Promise<string> {
  const response = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&encoding=linear16&sample_rate=8000&channels=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: audioBuffer,
    }
  )

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
  await supabase.from('call_detail_records').upsert({
    call_uuid: callUuid,
    account_id: accountId,
    direction: 'inbound',
    from_number: callerNumber,
    to_number: 'AI Receptionist',
    status: 'completed',
    ai_transcript: JSON.stringify(conversation),
    ai_summary: summary,
  })
}

export async function generateCallSummary(conversation: ConversationMessage[]): Promise<string> {
  if (conversation.length === 0) return 'No conversation recorded.'

  const transcriptText = conversation
    .map(m => `${m.role === 'user' ? 'Caller' : 'AI'}: ${m.content}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Summarize this phone call in 2-3 sentences. Focus on: what the caller needed, what was resolved, and any follow-up required.\n\nTranscript:\n${transcriptText}`,
    }],
  })

  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text : 'Call completed.'
}

