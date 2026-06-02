'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Mic, Trash2, Clock, CheckCircle, Phone } from 'lucide-react'

export default function VoicemailPage() {
  const [voicemails, setVoicemails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadVoicemails() }, [])

  async function loadVoicemails() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('voicemails').select('*').eq('account_id', user.id).order('created_at', { ascending: false })
    setVoicemails(data || [])
    setLoading(false)
  }

  async function markListened(id: string) {
    await supabase.from('voicemails').update({ listened: true }).eq('id', id)
    setVoicemails(v => v.map(vm => vm.id === id ? { ...vm, listened: true } : vm))
  }

  async function deleteVoicemail(id: string) {
    await supabase.from('voicemails').delete().eq('id', id)
    setVoicemails(v => v.filter(vm => vm.id !== id))
  }

  const unread = voicemails.filter(v => !v.listened).length

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voicemail</h2>
          <p className="text-gray-500 mt-1">{unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''}` : 'All messages read'}</p>
        </div>
        {unread > 0 && <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">{unread} New</span>}
      </div>

      <div className="bg-gradient-to-r from-[#0C2C68] to-[#1A56C4] rounded-xl p-5 text-white mb-6">
        <div className="flex items-center gap-2 mb-2"><Mic size={18} /><span className="font-semibold">AI-Powered Voicemail</span></div>
        <p className="text-blue-100 text-sm">Caller messages are automatically transcribed and summarized by AI. You receive an email with the transcript so you never miss an important message.</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading voicemails...</div>
      ) : voicemails.length > 0 ? (
        <div className="space-y-4">
          {voicemails.map(vm => (
            <div key={vm.id} className={`bg-white rounded-xl border shadow-sm p-5 ${!vm.listened ? 'border-blue-200' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${!vm.listened ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Mic size={18} className={!vm.listened ? 'text-blue-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 flex items-center gap-1"><Phone size={13} className="text-gray-400" /> {vm.from_number}</span>
                      {!vm.listened && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">New</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={11} /> {vm.duration_sec}s</span>
                      <span>{new Date(vm.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!vm.listened && (
                    <button onClick={() => markListened(vm.id)} className="flex items-center gap-1 px-3 py-1.5 bg-[#0C2C68] text-white rounded-lg text-xs font-medium hover:bg-[#1A56C4]">
                      <CheckCircle size={12} /> Mark Read
                    </button>
                  )}
                  <button onClick={() => deleteVoicemail(vm.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                </div>
              </div>
              {vm.ai_summary && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1"><Mic size={11} /> AI Summary</p>
                  <p className="text-sm text-gray-700">{vm.ai_summary}</p>
                </div>
              )}
              {vm.ai_transcript && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View transcript</summary>
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{vm.ai_transcript}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-20">
          <Mic size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No voicemails yet</p>
          <p className="text-sm text-gray-400 mt-1">Voicemails appear here when callers leave messages</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg mx-auto max-w-sm text-left">
            <p className="text-xs font-semibold text-blue-800 mb-2">One-time Supabase setup required</p>
            <p className="text-xs text-blue-700">Run this SQL in Supabase to enable voicemail storage:</p>
            <pre className="text-xs font-mono text-blue-900 mt-2 whitespace-pre-wrap bg-blue-100 p-2 rounded">{`CREATE TABLE IF NOT EXISTS voicemails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid REFERENCES auth.users,
  from_number text,
  duration_sec integer DEFAULT 0,
  ai_transcript text,
  ai_summary text,
  audio_url text,
  listened boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own voicemails" ON voicemails
FOR ALL USING (auth.uid() = account_id);`}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
