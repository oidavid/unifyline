'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, PhoneIncoming, Delete, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming'

const SIP_SERVER = '198.58.114.103'
const WS_URL = `wss://${SIP_SERVER}:7443`

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:198.58.114.103:3478' },
  { urls: 'turn:198.58.114.103:3478', username: 'unifyline', credential: 'UnifyTurn2026!' },
  { urls: 'turns:198.58.114.103:5349', username: 'unifyline', credential: 'UnifyTurn2026!' },
]

export default function SoftPhonePage() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [dialNumber, setDialNumber] = useState('')
  const [muted, setMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [incomingFrom, setIncomingFrom] = useState('')
  const [extension, setExtension] = useState('101')
  const [password, setPassword] = useState('UL101secure!')
  const [registered, setRegistered] = useState(false)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [ua, setUa] = useState<any>(null)
  const [currentCall, setCurrentCall] = useState<any>(null)
  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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

  async function initSIP() {
    try {
      const JsSIP = await import('jssip')
      JsSIP.debug.enable('JsSIP:*')

      const socket = new JsSIP.WebSocketInterface(WS_URL)
      const userAgent = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${extension}@${SIP_SERVER}`,
        password: password,
        display_name: `Ext ${extension}`,
        register: true,
        register_expires: 300,
        session_timers: false,
      })

      userAgent.on('registered', () => {
        console.log('[SIP] Registered!')
        setRegistered(true)
      })

      userAgent.on('unregistered', () => {
        setRegistered(false)
      })

      userAgent.on('registrationFailed', (e: any) => {
        console.error('[SIP] Registration failed:', e)
        setRegistered(false)
      })

      userAgent.on('newRTCSession', (e: any) => {
        const session = e.session

        if (session.direction === 'incoming') {
          setIncomingFrom(e.request.from.display_name || e.request.from.uri.user)
          setCallState('incoming')
          setCurrentCall(session)

          session.on('ended', () => { setCallState('idle'); setCurrentCall(null); loadRecentCalls() })
          session.on('failed', () => { setCallState('idle'); setCurrentCall(null) })
        }
      })

      userAgent.start()
      setUa(userAgent)
    } catch (err) {
      console.error('[SIP] Init error:', err)
    }
  }

  function attachAudio(session: any) {
    if (session.connection && audioRef.current) {
      const remoteStream = new MediaStream()
      session.connection.getReceivers().forEach((r: any) => remoteStream.addTrack(r.track))
      audioRef.current.srcObject = remoteStream
      audioRef.current.play().catch((e: any) => console.warn('[SIP] Audio play error:', e))
    }
  }

  function handleCall() {
    if (!dialNumber) return
    if (!ua) {
      setCallState('connecting')
      setTimeout(() => setCallState('ringing'), 800)
      setTimeout(() => setCallState('active'), 3000)
      return
    }

    const target = `sip:${dialNumber}@${SIP_SERVER}`

    const session = ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      sessionTimersExpires: 120,
      pcConfig: {
        iceServers: ICE_SERVERS,
        iceTransportPolicy: 'all',
      },
    })

    setCurrentCall(session)
    setCallState('connecting')

    // Inject TURN servers into the peer connection as soon as it's available
    session.on('peerconnection', (data: any) => {
      const pc = data.peerconnection
      console.log('[SIP] PeerConnection created, ICE servers:', pc.getConfiguration?.()?.iceServers)
      pc.addEventListener('icecandidate', (e: any) => {
        console.log('[SIP] ICE candidate:', e.candidate?.type, e.candidate?.address)
      })
    })

    session.on('progress', () => setCallState('ringing'))
    session.on('accepted', () => {
      setCallState('active')
      attachAudio(session)
    })
    session.on('confirmed', () => {
      setCallState('active')
      attachAudio(session)
    })
    session.on('ended', () => { setCallState('idle'); setCurrentCall(null); loadRecentCalls() })
    session.on('failed', (e: any) => {
      console.error('[SIP] Call failed:', e?.cause, e?.message)
      setCallState('idle')
      setCurrentCall(null)
    })
  }

  function handleHangup() {
    if (currentCall) { try { currentCall.terminate() } catch(e) {} }
    setCallState('idle'); setDialNumber(''); setMuted(false); setCurrentCall(null)
  }

  function handleAnswer() {
    if (!currentCall) return
    currentCall.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: ICE_SERVERS,
        iceTransportPolicy: 'all',
      },
    })
    setCallState('active')
    setTimeout(() => attachAudio(currentCall), 500)
  }

  function toggleMute() {
    if (!currentCall) return
    muted ? currentCall.unmute() : currentCall.mute()
    setMuted(!muted)
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  const extConfigs = [
    { ext: '101', label: 'Sales', pass: 'UL101secure!' },
    { ext: '102', label: 'Support', pass: 'UL102secure!' },
    { ext: '103', label: 'Management', pass: 'UL103secure!' },
    { ext: '104', label: 'CEO Direct', pass: 'UL104secure!' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <audio ref={audioRef} autoPlay />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phone</h2>
          <p className="text-gray-500 mt-1">Browser-based softphone powered by WebRTC</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {registered ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {registered ? `Ext ${extension} registered` : 'Not connected'}
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Settings</button>
          {!registered && (
            <button onClick={initSIP} className="px-4 py-1.5 bg-[#0C2C68] text-white rounded-lg text-xs font-semibold hover:bg-[#1A56C4]">Connect</button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">SIP Connection Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {extConfigs.map(cfg => (
              <button key={cfg.ext} onClick={() => { setExtension(cfg.ext); setPassword(cfg.pass) }}
                className={`p-3 rounded-xl border text-left transition ${extension === cfg.ext ? 'border-[#0C2C68] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-xs font-bold text-[#0C2C68]">Ext. {cfg.ext}</p>
                <p className="text-xs text-gray-500">{cfg.label}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Extension</label>
              <input value={extension} onChange={e => setExtension(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div className="flex items-end">
              <button onClick={() => { if (ua) { ua.stop(); setUa(null); setRegistered(false) } setTimeout(initSIP, 500) }}
                className="px-4 py-2 bg-[#0C2C68] text-white rounded-lg text-sm font-semibold hover:bg-[#1A56C4]">
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-[#0C2C68] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-blue-300 text-xs font-medium">Your Extension</p><p className="text-white font-bold text-lg">Ext. {extension}</p></div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 ${registered ? 'text-green-400' : 'text-gray-400'}`}>
                    {registered ? <Wifi size={12}/> : <WifiOff size={12}/>}
                    <span className="text-xs">{registered ? 'Live' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#071A3E] rounded-xl p-4 min-h-[80px] flex flex-col items-center justify-center">
                {callState === 'idle' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber || 'Enter number'}</p><p className="text-blue-400 text-xs mt-1">Ready</p></div>}
                {callState === 'connecting' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-yellow-400 text-xs mt-1 animate-pulse">Connecting...</p></div>}
                {callState === 'ringing' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-blue-300 text-xs mt-1 animate-pulse">Ringing...</p></div>}
                {callState === 'active' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber || incomingFrom}</p><p className="text-green-400 text-sm font-bold mt-1">{fmt(callDuration)}</p></div>}
                {callState === 'incoming' && <div className="text-center"><p className="text-blue-300 text-xs animate-pulse">Incoming Call</p><p className="text-white text-lg font-bold mt-1">{incomingFrom}</p></div>}
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                  <button key={key} onClick={() => setDialNumber(d => d + key)} className="bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-3 rounded-xl transition active:scale-95">{key}</button>
                ))}
              </div>
              {callState === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={handleCall} disabled={!dialNumber} className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition">
                    <Phone size={20}/>Call
                  </button>
                  <button onClick={() => setDialNumber(d => d.slice(0,-1))} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl transition">
                    <Delete size={18}/>
                  </button>
                </div>
              )}
              {callState === 'incoming' && (
                <div className="flex gap-3">
                  <button onClick={handleAnswer} className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Phone size={20}/>Answer</button>
                  <button onClick={handleHangup} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"><PhoneOff size={20}/>Decline</button>
                </div>
              )}
              {(callState === 'connecting' || callState === 'ringing' || callState === 'active') && (
                <div className="space-y-3">
                  {callState === 'active' && (
                    <div className="flex gap-3">
                      <button onClick={toggleMute} className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${muted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                        {muted ? <MicOff size={16}/> : <Mic size={16}/>}{muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-white/10 text-white">
                        <Volume2 size={16}/>Speaker
                      </button>
                    </div>
                  )}
                  <button onClick={handleHangup} className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                    <PhoneOff size={20}/>{callState === 'active' ? 'End Call' : 'Cancel'}
                  </button>
                </div>
              )}
              <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${registered ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}/>
                <span className="text-blue-200 text-xs">{registered ? 'WebRTC Connected · SIP over WebSocket' : 'Click Connect to activate'}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Ring Groups</h3>
            <div className="space-y-2">
              {[{name:'All Staff',num:'2000'},{name:'Sales Team',num:'2001'},{name:'Support',num:'2002'},{name:'Management',num:'2003'}].map(({name,num})=>(
                <button key={num} onClick={() => setDialNumber(num)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition text-left">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"/>
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">{name}</p></div>
                  <span className="text-xs text-gray-400 font-mono">{num}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Calls</h3>
              <span className="text-xs text-gray-400">Click to call back</span>
            </div>
            <div className="divide-y divide-gray-50">
              {recentCalls.length > 0 ? recentCalls.map(cdr => (
                <div key={cdr.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className={`p-2 rounded-lg ${cdr.direction==='inbound'?'bg-green-100':'bg-blue-100'}`}>
                    <Phone size={16} className={cdr.direction==='inbound'?'text-green-600':'text-blue-600'}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{cdr.from_number}</p>
                    {cdr.ai_summary&&<p className="text-xs text-gray-500 truncate mt-0.5">{cdr.ai_summary}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">{cdr.duration_sec}s</p>
                    <p className="text-xs text-gray-400">{new Date(cdr.created_at).toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => { setDialNumber(cdr.from_number); }} className="p-2 text-gray-400 hover:text-[#0C2C68] hover:bg-blue-50 rounded-lg transition flex-shrink-0">
                    <Phone size={14}/>
                  </button>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-400">
                  <Phone size={32} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">No recent calls</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gradient-to-r from-[#0C2C68] to-[#1A56C4] rounded-xl p-5 text-white">
            <h4 className="font-semibold mb-3">Your Extensions</h4>
            <div className="grid grid-cols-2 gap-3">
              {[{ext:'101',label:'Sales',did:'404-592-9690'},{ext:'102',label:'Support',did:'404-592-5562'},{ext:'103',label:'Management',did:'404-592-5562'},{ext:'104',label:'CEO Direct',did:'678-460-5180'}].map(({ext,label,did})=>(
                <div key={ext} className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm">Ext. {ext}</span>
                    <span className="text-blue-200 text-xs">{label}</span>
                  </div>
                  <p className="text-blue-300 text-xs font-mono">{did}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
