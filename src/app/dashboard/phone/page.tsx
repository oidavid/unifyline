'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, Delete, Wifi, WifiOff } from 'lucide-react'
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

// JsSIP creates RTCPeerConnection internally before any event fires.
// The only way to inject ICE/TURN config is to patch window.RTCPeerConnection
// before calling ua.call() or session.answer(), then restore it immediately after.
function patchedCall<T>(fn: () => T): T {
  const NativePC = window.RTCPeerConnection
  function PatchedPC(this: any, config: RTCConfiguration) {
    return new NativePC({ ...config, iceServers: ICE_SERVERS, iceTransportPolicy: 'all' })
  }
  PatchedPC.prototype = NativePC.prototype
  ;(PatchedPC as any).generateCertificate = NativePC.generateCertificate?.bind(NativePC)
  window.RTCPeerConnection = PatchedPC as any
  try {
    return fn()
  } finally {
    window.RTCPeerConnection = NativePC
  }
}

// Generate a stable browser-specific ringtone using Web Audio API
function createRingtone(ctx: AudioContext): { start: () => void; stop: () => void } {
  let interval: ReturnType<typeof setInterval> | null = null
  let oscillators: OscillatorNode[] = []

  function ring() {
    oscillators.forEach(o => { try { o.stop() } catch {} })
    oscillators = []

    const freqs = [440, 480]
    freqs.forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
      oscillators.push(osc)
    })
  }

  return {
    start() {
      ring()
      interval = setInterval(ring, 1200)
    },
    stop() {
      if (interval) clearInterval(interval)
      interval = null
      oscillators.forEach(o => { try { o.stop() } catch {} })
      oscillators = []
    }
  }
}

export default function SoftPhonePage() {
  const [callState, setCallState] = useState<CallState>('idle')
  const [dialNumber, setDialNumber] = useState('')
  const [muted, setMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [incomingFrom, setIncomingFrom] = useState('')
  const [extension, setExtension] = useState('101')
  const [password, setPassword] = useState('UL101secure!')
  const [sipDomain, setSipDomain] = useState(SIP_SERVER)
  const [registered, setRegistered] = useState(false)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [ua, setUa] = useState<any>(null)
  const [currentCall, setCurrentCall] = useState<any>(null)
  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentCallRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringtoneRef = useRef<{ start: () => void; stop: () => void } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadRecentCalls(); loadExtensions() }, [])
  async function loadExtensions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
    const accountId = auData?.account_id || user.id
    const { data } = await supabase.from('extensions').select('*').eq('account_id', accountId).order('extension_number')
    if (data && data.length > 0) {
      setDbExtensions(data)
      setExtension(data[0].extension_number)
      setPassword(data[0].sip_password || ULsecure!)
    }
  }

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setCallDuration(0)
    }
    return () => clearInterval(timerRef.current)
  }, [callState])

  // Start/stop ringtone based on call state
  useEffect(() => {
    if (callState === 'incoming') {
      startRingtone()
    } else {
      stopRingtone()
    }
  }, [callState])

  function startRingtone() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      ringtoneRef.current = createRingtone(audioCtxRef.current)
      ringtoneRef.current.start()
    } catch (e) {
      console.warn('[Ringtone] failed to start:', e)
    }
  }

  function stopRingtone() {
    try {
      ringtoneRef.current?.stop()
      ringtoneRef.current = null
    } catch (e) {
      console.warn('[Ringtone] failed to stop:', e)
    }
  }

  async function loadRecentCalls() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
    const accountId = auData?.account_id || user.id
    const { data } = await supabase
      .from('call_detail_records')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(8)
    setRecentCalls(data || [])
  }

  async function initSIP() {
    try {
      const JsSIP = await import('jssip')
      JsSIP.debug.enable('JsSIP:*')

      const socket = new JsSIP.WebSocketInterface(WS_URL)
      const userAgent = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${extension}@${sipDomain}`,
        password,
        display_name: `Ext ${extension}`,
        register: true,
        register_expires: 300,
        session_timers: false,
      })

      // Ghost-registration fix: on first register, flush all stale contacts
      // then re-register so this browser is the only active contact for this extension.
      let staleContactsFlushed = false
      userAgent.on('registered', () => {
        setRegistered(true)
        if (!staleContactsFlushed) {
          staleContactsFlushed = true
          try {
            userAgent.unregister({ all: true })
            setTimeout(() => {
              try { userAgent.register() } catch {}
            }, 800)
          } catch {}
        }
      })

      userAgent.on('unregistered', () => setRegistered(false))
      userAgent.on('registrationFailed', () => setRegistered(false))

      userAgent.on('newRTCSession', (e: any) => {
        const session = e.session
        if (session.direction === 'incoming') {
          setIncomingFrom(e.request.from.display_name || e.request.from.uri.user)
          setCallState('incoming')
          setCurrentCall(session)
          currentCallRef.current = session
          session.on('ended', () => {
            stopRingtone()
            setCallState('idle')
            setCurrentCall(null)
            currentCallRef.current = null
            loadRecentCalls()
          })
          session.on('failed', () => {
            stopRingtone()
            setCallState('idle')
            setCurrentCall(null)
            currentCallRef.current = null
          })
        }
      })

      userAgent.start()
      setUa(userAgent)
    } catch (err) {
      console.error('[SIP] Init error:', err)
    }
  }

  function attachAudio(session: any) {
    try {
      if (session?.connection && audioRef.current) {
        const remoteStream = new MediaStream()
        session.connection.getReceivers().forEach((r: any) => {
          if (r.track) remoteStream.addTrack(r.track)
        })
        audioRef.current.srcObject = remoteStream
        audioRef.current.play().catch((e: any) => console.warn('[Audio]', e))
      }
    } catch(e) { console.warn('[Audio] attach error:', e) }
  }

  function handleCall() {
    if (!dialNumber || !ua) return
    const target = `sip:${dialNumber}@${sipDomain}`
    const session = patchedCall(() => ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      sessionTimersExpires: 120,
    }))
    setCurrentCall(session)
    currentCallRef.current = session
    setCallState('connecting')

    session.on('peerconnection', (data: any) => {
      const pc = data.peerconnection
      pc.addEventListener('icecandidate', (e: any) => {
        console.log('[ICE] candidate type:', e.candidate?.type)
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
    session.on('ended', () => {
      setCallState('idle')
      setCurrentCall(null)
      currentCallRef.current = null
      loadRecentCalls()
    })
    session.on('failed', () => {
      setCallState('idle')
      setCurrentCall(null)
      currentCallRef.current = null
    })
  }

  function handleAnswer() {
    const session = currentCallRef.current
    if (!session) return
    stopRingtone()
    patchedCall(() => session.answer({
      mediaConstraints: { audio: true, video: false },
    }))
    setCallState('active')
    session.on('confirmed', () => attachAudio(session))
    session.connection?.addEventListener('track', () => attachAudio(session))
  }

  function handleHangup() {
    stopRingtone()
    const session = currentCallRef.current
    if (session) {
      try { session.terminate() } catch {}
    }
    setCallState('idle')
    setCurrentCall(null)
    currentCallRef.current = null
  }

  function toggleMute() {
    const session = currentCallRef.current
    if (!session) return
    if (muted) {
      session.unmute({ audio: true })
    } else {
      session.mute({ audio: true })
    }
    setMuted(!muted)
  }

  function sendDtmf(tone: string) {
    try {
      currentCallRef.current?.sendDTMF(tone)
    } catch (e) {
      console.warn('[DTMF] error:', e)
    }
  }

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const EXTENSION_PRESETS = [
    { ext: '101', label: 'Sales', pw: 'UL101secure!', domain: SIP_SERVER },
    { ext: '102', label: 'Support', pw: 'UL102secure!', domain: SIP_SERVER },
    { ext: '103', label: 'Management', pw: 'UL103secure!', domain: SIP_SERVER },
    { ext: '104', label: 'CEO Direct', pw: 'UL104secure!', domain: SIP_SERVER },
    { ext: '201', label: 'MTI Test (isolated tenant)', pw: 'MTI201secure!', domain: 'mti.unifyline.local' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <audio ref={audioRef} autoPlay />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Phone</h2>
          <p className="text-sm text-gray-500">Browser-based softphone powered by WebRTC</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-sm ${registered ? 'text-green-600' : 'text-gray-400'}`}>
            {registered ? <Wifi size={14}/> : <WifiOff size={14}/>}
            {registered ? 'Connected' : 'Not connected'}
          </div>
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Settings
          </button>
          <button onClick={() => { if (ua) { ua.stop(); setUa(null); setRegistered(false) } setTimeout(initSIP, 500) }}
            className="px-4 py-1.5 text-sm bg-[#0C2C68] text-white rounded-lg hover:bg-[#1A56C4] font-medium">
            {registered ? 'Reconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">SIP Connection Settings</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {EXTENSION_PRESETS.map(p => (
              <button key={p.ext}
                onClick={() => { setExtension(p.ext); setPassword(p.pw); setSipDomain(p.domain) }}
                className={`p-3 rounded-lg border-2 text-left transition ${extension === p.ext ? 'border-[#0C2C68] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-semibold text-sm text-[#0C2C68]">Ext. {p.ext}</p>
                <p className="text-xs text-gray-500">{p.label}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Extension</label>
              <input value={extension} onChange={e => setExtension(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0C2C68]"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0C2C68]"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">SIP Domain</label>
              <input value={sipDomain} onChange={e => setSipDomain(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0C2C68]"/>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-[#0C2C68] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-300 text-xs font-medium">Your Extension</p>
                  <p className="text-white font-bold text-lg">Ext. {extension}</p>
                </div>
                <div className={`flex items-center gap-1 ${registered ? 'text-green-400' : 'text-gray-400'}`}>
                  {registered ? <Wifi size={12}/> : <WifiOff size={12}/>}
                  <span className="text-xs">{registered ? 'Live' : 'Offline'}</span>
                </div>
              </div>
              <div className="bg-[#071A3E] rounded-xl p-4 min-h-[80px] flex flex-col items-center justify-center">
                {callState === 'idle' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber || 'Enter number'}</p><p className="text-blue-400 text-xs mt-1">Ready</p></div>}
                {callState === 'connecting' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-yellow-400 text-xs mt-1 animate-pulse">Connecting...</p></div>}
                {callState === 'ringing' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber}</p><p className="text-blue-300 text-xs mt-1 animate-pulse">Ringing...</p></div>}
                {callState === 'active' && <div className="text-center"><p className="text-white text-xl font-mono">{dialNumber || incomingFrom}</p><p className="text-green-400 text-sm font-bold mt-1">{fmt(callDuration)}</p></div>}
                {callState === 'incoming' && (
                  <div className="text-center">
                    <p className="text-blue-300 text-xs animate-pulse">📞 Incoming Call</p>
                    <p className="text-white text-lg font-bold mt-1">{incomingFrom}</p>
                    <p className="text-blue-300 text-xs mt-1 animate-pulse">Ringing...</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                  <button key={key}
                    onClick={() => callState === 'active' ? sendDtmf(key) : setDialNumber(d => d + key)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-3 rounded-xl transition active:scale-95">
                    {key}
                  </button>
                ))}
              </div>

              {callState === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={handleCall} disabled={!dialNumber || !registered}
                    className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition">
                    <Phone size={20}/>Call
                  </button>
                  <button onClick={() => setDialNumber(d => d.slice(0,-1))}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl transition">
                    <Delete size={18}/>
                  </button>
                </div>
              )}

              {callState === 'incoming' && (
                <div className="flex gap-3">
                  <button onClick={handleAnswer}
                    className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                    <Phone size={20}/>Answer
                  </button>
                  <button onClick={handleHangup}
                    className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                    <PhoneOff size={20}/>Decline
                  </button>
                </div>
              )}

              {(callState === 'connecting' || callState === 'ringing' || callState === 'active') && (
                <div className="space-y-3">
                  {callState === 'active' && (
                    <div className="flex gap-2">
                      <button onClick={toggleMute}
                        className={`flex-1 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1 ${muted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                        {muted ? <MicOff size={14}/> : <Mic size={14}/>}{muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button className="flex-1 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1 bg-white/10 text-white">
                        <Volume2 size={14}/>Speaker
                      </button>
                    </div>
                  )}
                  <button onClick={handleHangup}
                    className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                    <PhoneOff size={20}/>{callState === 'active' ? 'End Call' : 'Cancel'}
                  </button>
                </div>
              )}

              <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${registered ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}/>
                <span className="text-blue-200 text-xs">
                  {registered ? `Ext ${extension} · WebRTC Connected` : 'Click Connect to activate'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Ring Groups</h3>
            <div className="space-y-2">
              {[{name:'All Staff',num:'2000'},{name:'Sales Team',num:'2001'},{name:'Support',num:'2002'},{name:'Management',num:'2003'}].map(({name,num})=>(
                <button key={num} onClick={() => setDialNumber(num)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition text-left">
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
                  <button onClick={() => setDialNumber(cdr.from_number)}
                    className="p-2 text-gray-400 hover:text-[#0C2C68] hover:bg-blue-50 rounded-lg transition flex-shrink-0">
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
              {[
                {ext:'101',label:'Sales',did:'404-592-9690'},
                {ext:'102',label:'Support',did:'404-592-5562'},
                {ext:'103',label:'Management',did:'404-592-5562'},
                {ext:'104',label:'CEO Direct',did:'678-460-5180'}
              ].map(({ext,label,did})=>(
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
