import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PhoneIncoming, PhoneOutgoing, Phone, Mic, Clock } from 'lucide-react'

export default async function CallLogsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Multi-tenant: get account_id from account_users, not user.id directly
  const { data: auData } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  const accountId = auData?.account_id || user.id

  const { data: cdrs } = await supabase
    .from('call_detail_records')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(100)

  const formatDuration = (s: number) => {
    if (!s) return '0:00'
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Call Logs</h2>
        <p className="text-gray-500 mt-1 text-sm">Complete history with AI summaries and transcripts</p>
      </div>

      {cdrs && cdrs.length > 0 ? (
        <div className="space-y-3">
          {cdrs.map(cdr => {
            let transcript: {role: string, content: string}[] = []
            try { if (cdr.ai_transcript) transcript = JSON.parse(cdr.ai_transcript) } catch {}

            return (
              <div key={cdr.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${cdr.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      {cdr.direction === 'inbound'
                        ? <PhoneIncoming size={16} className="text-green-600" />
                        : <PhoneOutgoing size={16} className="text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {cdr.direction === 'inbound' ? cdr.from_number : cdr.to_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cdr.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {cdr.direction}
                        </span>
                        {cdr.ai_summary && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                            <Mic size={10} /> AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(cdr.duration_sec)}</span>
                        <span>{new Date(cdr.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {cdr.ai_summary && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Mic size={11} /> AI Summary
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{cdr.ai_summary}</p>
                    </div>
                  )}

                  {transcript.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-[#0C2C68] cursor-pointer hover:underline font-medium select-none">
                        View transcript ({transcript.length} exchanges)
                      </summary>
                      <div className="mt-2 space-y-2 max-h-56 overflow-y-auto bg-gray-50 rounded-lg p-3">
                        {transcript.map((msg, i) => (
                          <div key={i} className={`flex gap-2 ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'assistant' ? 'bg-[#0C2C68] text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                              <span className="font-semibold block mb-0.5 opacity-70">{msg.role === 'assistant' ? 'AI' : 'Caller'}</span>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <Phone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No call records yet</p>
          <p className="text-sm mt-1">Call (404) 592-5562 to test your AI receptionist</p>
        </div>
      )}
    </div>
  )
}
