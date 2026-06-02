'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, PhoneIncoming, Delete } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type CallState = 'idle' | 'connecting' | 'ringing' | 'active'

export default function SoftPhonePage() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [dialNumber, setDialNumber] = useState('')
  const [muted, setMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const timerRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => { loadRecentCalls() }, [])
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else { clearInterval(timerRef.current); setCallDuration(0) }
    return () => clearInterval(timerRef.current)
  }, [callState])

  async function loadRecentCalls() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('call_detail_records').select('*').eq('account_id', user.id).order('created_at', { ascending: false }).limit(8)
    setRecentCalls(data || [])
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  function handleCall() {
    if (!dialNumber) return
    setCallState('connecting')
    setTimeout(() => setCallState('ringing'), 800)
    setTimeout(() => setCallState('active'), 3000)
  }

  function handleHangup() { setCallState('idle'); setDialNumber(''); setMuted(false); loadRecentCalls() }

  const keys = [['1','2','3'],['4','5','6'],['7','8','9'],['*','0','#']]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Phone</h2>
        <p className="text-gray-500 mt-1">Make and receive calls from your browser</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-[#0C2C68] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-blue-300 text-xs font-medium">Extension</p><p className="text-white font-bold text-lg">Ext. 101</p></div>
                <div className="text-right"><p className="text-blue-300 text-xs font-medium">DID</p><p className="text-white font-mono text-sm">(404) 592-5562</p></div>
              </div>
              <div className="bg-[#071A3E] rounded-xl p-4 min-h-[80px] flex flex-col items-center justify-center">
                {callState === 'idle' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber || 'Enter number'}</p><p className="text-blue-400 text-xs mt-1">Ready</p></div>}
                {callState === 'connecting' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-yellow-400 text-xs mt-1 animate-pulse">Connecting...</p></div>}
                {callState === 'ringing' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-blue-400 text-xs mt-1 animate-pulse">Ringing...</p></div>}
                {callState === 'active' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-green-400 text-sm font-bold mt-1">{fmt(callDuration)}</p></div>}
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {keys.flat().map(key => (
                  <button key={key} onClick={() => setDialNumber(d => d + key)} className="bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-3 rounded-xl transition">{key}</button>
                ))}
              </div>
              {callState === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={handleCall} disabled={!dialNumber} className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2">
                    <Phone size={20} />Call
                  </button>
                  <button onClick={() => setDialNumber(d => d.slice(0,-1))} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl transition">
                    <Delete size={18} />
                  </button>
                </div>
              )}
              {callState !== 'idle' && (
                <div className="space-y-3">
                  {callState === 'active' && (
                    <div className="flex gap-3">
                      <button onClick={() => setMuted(!muted)} className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${muted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                        {muted ? <MicOff size={16}/> : <Mic size={16}/>}{muted ? 'Unmute' : 'Mute'}
                      </button>
                    </div>
                  )}
                  <button onClick={handleHangup} className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2">
                    <PhoneOff size={20}/>{callState === 'active' ? 'End Call' : 'Cancel'}
                  </button>
                </div>
              )}
              <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-blue-200 text-xs">Connected to UnifyLine</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Quick Dial</h3>
            <div className="space-y-2">
              {[{name:'Sales Team',ext:'101',status:'available'},{name:'Support',ext:'102',status:'busy'},{name:'Main Office',ext:'100',status:'available'}].map(({name,ext,status})=>(
                <button key={ext} onClick={() => setDialNumber(ext)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition text-left">
                  <div className={`w-2.5 h-2.5 rounded-full ${status==='available'?'bg-green-400':'bg-red-400'}`} />
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">{name}</p><p className="text-xs text-gray-500">Ext. {ext}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Recent Calls</h3></div>
            <div className="divide-y divide-gray-50">
              {recentCalls.length > 0 ? recentCalls.map(cdr => (
                <div key={cdr.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className={`p-2 rounded-lg ${cdr.direction==='inbound'?'bg-green-100':'bg-blue-100'}`}>
                    {cdr.direction==='inbound'?<PhoneIncoming size={16} className="text-green-600"/>:<Phone size={16} className="text-blue-600"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{cdr.from_number}</p>
                    {cdr.ai_summary&&<p className="text-xs text-gray-500 truncate mt-0.5">{cdr.ai_summary}</p>}
                  </div>
                  <div className="text-right"><p className="text-xs text-gray-500">{cdr.duration_sec}s</p><p className="text-xs text-gray-400">{new Date(cdr.created_at).toLocaleTimeString()}</p></div>
                  <button onClick={() => setDialNumber(cdr.from_number)} className="p-2 text-gray-400 hover:text-[#0C2C68] rounded-lg"><Phone size={14}/></button>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-400"><Phone size={32} className="mx-auto mb-2 opacity-30"/><p className="text-sm">No recent calls</p></div>
              )}
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h4 className="font-semibold text-[#0C2C68] mb-2">WebRTC Activation</h4>
            <p className="text-sm text-gray-600 mb-2">To enable live browser calls, run on Linode:</p>
            <pre className="bg-white rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">{`# Enable WebSocket transport in FreeSWITCH
# /usr/local/freeswitch/conf/sip_profiles/internal.xml
# Add: <param name="ws-binding" value=":5066"/>
# Reload: fs_cli -x "sofia profile internal rescan"`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
