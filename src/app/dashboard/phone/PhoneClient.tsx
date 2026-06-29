'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Delete, Wifi, WifiOff, Grid3x3, Settings as SettingsIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming'

const SIP_TRANSPORT_HOST = '198.58.114.103'
const WS_URL = `wss://${SIP_TRANSPORT_HOST}:7443`

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:198.58.114.103:3478', username: 'unifyline', credential: 'UnifyTurn2026!' },
  { urls: 'turns:198.58.114.103:5349', username: 'unifyline', credential: 'UnifyTurn2026!' },
]

type TenantTheme = {
  dark: boolean
  // Dialpad card
  dialpadBg: string
  dialpadText: string
  dialpadSubtext: string
  dialpadDisplayBg: string
  dialpadKeyBg: string
  dialpadKeyHover: string
  // Call button
  callBtnBg: string
  callBtnText: string
  // Status indicator
  statusBg: string
  statusText: string
  // Panels (right side)
  panelBg: string
  panelBorder: string
  panelText: string
  panelSubtext: string
  // Extensions gradient card
  extCardBg: string
  extCardItemBg: string
  extCardText: string
  extCardSubtext: string
  // Header accent color for buttons
  accentBg: string
  accentText: string
  accentHover: string
  // Ring groups
  ringGroupDot: string
  // Reconnect button
  reconnectBg: string
  reconnectText: string
  reconnectHover: string
  // Settings panel
  settingsBg: string
  settingsBorder: string
  settingsSelectedBg: string
  settingsSelectedBorder: string
  settingsSelectedText: string
}

function buildTheme(primaryColor: string): TenantTheme {
  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)

  if (isDark) {
    // MTI dark gold theme
    return {
      dark: true,
      dialpadBg: '#1C1813',
      dialpadText: '#F7F5F0',
      dialpadSubtext: '#C9A23F',
      dialpadDisplayBg: '#0A0A0A',
      dialpadKeyBg: 'rgba(255,255,255,0.08)',
      dialpadKeyHover: 'rgba(255,255,255,0.14)',
      callBtnBg: '#E8C26A',
      callBtnText: '#0A0A0A',
      statusBg: 'rgba(232,194,106,0.15)',
      statusText: '#E8C26A',
      panelBg: '#1A150E',
      panelBorder: '#3A3020',
      panelText: '#FFFFFF',
      panelSubtext: '#D4C5A0',
      extCardBg: '#1C1813',
      extCardItemBg: 'rgba(232,194,106,0.12)',
      extCardText: '#FFFFFF',
      extCardSubtext: '#F0D080',
      accentBg: '#E8C26A',
      accentText: '#0A0A0A',
      accentHover: '#C9A23F',
      ringGroupDot: '#E8C26A',
      reconnectBg: '#E8C26A',
      reconnectText: '#0A0A0A',
      reconnectHover: '#C9A23F',
      settingsBg: '#1C1813',
      settingsBorder: '#2A241A',
      settingsSelectedBg: 'rgba(232,194,106,0.15)',
      settingsSelectedBorder: '#E8C26A',
      settingsSelectedText: '#E8C26A',
    }
  }

  // IntelSys / default blue theme
  return {
    dark: false,
    dialpadBg: '#0C2C68',
    dialpadText: '#FFFFFF',
    dialpadSubtext: '#93C5FD',
    dialpadDisplayBg: '#071A3E',
    dialpadKeyBg: 'rgba(255,255,255,0.10)',
    dialpadKeyHover: 'rgba(255,255,255,0.20)',
    callBtnBg: '#22C55E',
    callBtnText: '#FFFFFF',
    statusBg: 'rgba(255,255,255,0.05)',
    statusText: '#93C5FD',
    panelBg: '#FFFFFF',
    panelBorder: '#E2E8F0',
    panelText: '#111827',
    panelSubtext: '#6B7280',
    extCardBg: '#0C2C68',
    extCardItemBg: 'rgba(255,255,255,0.10)',
    extCardText: '#FFFFFF',
    extCardSubtext: '#93C5FD',
    accentBg: '#0C2C68',
    accentText: '#FFFFFF',
    accentHover: '#1A56C4',
    ringGroupDot: '#60A5FA',
    reconnectBg: '#0C2C68',
    reconnectText: '#FFFFFF',
    reconnectHover: '#1A56C4',
    settingsBg: '#FFFFFF',
    settingsBorder: '#E2E8F0',
    settingsSelectedBg: '#EFF6FF',
    settingsSelectedBorder: '#0C2C68',
    settingsSelectedText: '#0C2C68',
  }
}

function patchedCall<T>(fn: () => T): T {
  const NativePC = window.RTCPeerConnection
  function PatchedPC(this: any, config: RTCConfiguration) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    return new NativePC({ ...config, iceServers: ICE_SERVERS, iceTransportPolicy: isMobile ? 'relay' : 'all' })
  }
  PatchedPC.prototype = NativePC.prototype
  ;(PatchedPC as any).generateCertificate = NativePC.generateCertificate?.bind(NativePC)
  window.RTCPeerConnection = PatchedPC as any
  try { return fn() } finally { window.RTCPeerConnection = NativePC }
}

function createRingtone(ctx: AudioContext): { start: () => void; stop: () => void } {
  let interval: ReturnType<typeof setInterval> | null = null
  let oscillators: OscillatorNode[] = []
  function ring() {
    oscillators.forEach(o => { try { o.stop() } catch {} })
    oscillators = []
    ;[440, 480].forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
      oscillators.push(osc)
    })
  }
  return {
    start() { ring(); interval = setInterval(ring, 1200) },
    stop() {
      if (interval) clearInterval(interval)
      interval = null
      oscillators.forEach(o => { try { o.stop() } catch {} })
      oscillators = []
    }
  }
}

export default function PhoneClient({ initialColor }: { initialColor: string }) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [dialNumber, setDialNumber] = useState('')
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [incomingFrom, setIncomingFrom] = useState('')
  const [extension, setExtension] = useState('')
  const [password, setPassword] = useState('')
  const [sipDomain, setSipDomain] = useState(SIP_TRANSPORT_HOST)
  const [registered, setRegistered] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [dbExtensions, setDbExtensions] = useState<any[]>([])
  // initialColor comes from the server wrapper — correct on SSR, no hydration mismatch, zero flash
  const [theme, setTheme] = useState<TenantTheme>(() => buildTheme(initialColor))
  const [ua, setUa] = useState<any>(null)

  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentCallRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringtoneRef = useRef<{ start: () => void; stop: () => void } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadTenantData() }, [])

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration((d: number) => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setCallDuration(0)
    }
    return () => clearInterval(timerRef.current)
  }, [callState])

  useEffect(() => {
    if (callState === 'incoming') startRingtone()
    else stopRingtone()
  }, [callState])

  function startRingtone() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
      ringtoneRef.current = createRingtone(audioCtxRef.current)
      ringtoneRef.current.start()
    } catch (e) { console.warn('[Ringtone]', e) }
  }

  function stopRingtone() {
    try { ringtoneRef.current?.stop(); ringtoneRef.current = null } catch {}
  }

  async function loadTenantData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
      const accId = auData?.account_id || user.id

      const { data: account } = await supabase.from('accounts').select('sip_domain').eq('id', accId).single()
      const domain = account?.sip_domain || SIP_TRANSPORT_HOST
      setSipDomain(domain)

      const { data: exts } = await supabase.from('extensions').select('*').eq('account_id', accId).order('extension_number')
      if (exts && exts.length > 0) {
        setDbExtensions(exts)
        setExtension(exts[0].extension_number)
        setPassword(exts[0].sip_password || `UL${exts[0].extension_number}secure!`)
      }

      try {
        const res = await fetch(`/api/recent-calls?account_id=${accId}&limit=8`)
        if (res.ok) { const calls = await res.json(); setRecentCalls(calls || []) }
      } catch (e) { console.warn('[recentCalls]', e) }
    } catch (e) { console.error('[loadTenantData]', e) }
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
    } catch (e) { console.warn('[Audio] attach error:', e) }
  }

  async function initSIP() {
    if (!extension || !password) return
    setConnecting(true)
    try {
      const JsSIP = await import('jssip')
      const socket = new JsSIP.WebSocketInterface(WS_URL)
      const userAgent = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${extension}@${sipDomain}`,
        password,
        display_name: `Ext ${extension}`,
        register: true,
        register_expires: 60,
        session_timers: false,
      })

      const cleanup = () => { try { userAgent.unregister({ all: true }) } catch {} }
      window.addEventListener('beforeunload', cleanup)

      let staleContactsFlushed = false
      userAgent.on('registered', () => {
        setRegistered(true)
        setConnecting(false)
        if (!staleContactsFlushed) {
          staleContactsFlushed = true
          try { userAgent.unregister({ all: true }) } catch {}
          setTimeout(() => { try { userAgent.register() } catch {} }, 800)
        }
      })
      userAgent.on('unregistered', () => { if (staleContactsFlushed) setRegistered(true) })
      userAgent.on('registrationFailed', () => { setRegistered(false); setConnecting(false) })

      userAgent.on('newRTCSession', (data: any) => {
        const session = data.session
        currentCallRef.current = session
        if (session.direction === 'incoming') {
          setIncomingFrom(session.remote_identity?.uri?.user || 'Unknown')
          setCallState('incoming')
          session.on('ended', () => { stopRingtone(); setCallState('idle'); currentCallRef.current = null; loadTenantData() })
          session.on('failed', () => { stopRingtone(); setCallState('idle'); currentCallRef.current = null })
        } else {
          session.on('progress', () => setCallState('ringing'))
          session.on('accepted', () => { setCallState('active'); attachAudio(session) })
          session.on('confirmed', () => { setCallState('active'); attachAudio(session) })
          session.on('ended', () => { setCallState('idle'); currentCallRef.current = null; loadTenantData() })
          session.on('failed', () => { setCallState('idle'); currentCallRef.current = null })
        }
      })

      userAgent.start()
      setUa(userAgent)
    } catch (e) { console.error('[SIP]', e); setConnecting(false) }
  }

  function handleReconnect() {
    if (ua) { try { ua.stop() } catch {}; setUa(null); setRegistered(false) }
    setTimeout(initSIP, 500)
  }

  function handleCall() {
    if (!ua || !dialNumber) return
    try {
      patchedCall(() => ua.call(`sip:${dialNumber}@${sipDomain}`, {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      }))
      setCallState('connecting')
    } catch (e) { console.error('[SIP] call error:', e) }
  }

  function handleAnswer() {
    if (!currentCallRef.current) return
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current.resume()
      stopRingtone()
      patchedCall(() => currentCallRef.current.answer({ mediaConstraints: { audio: true, video: false } }))
      setCallState('active')
      currentCallRef.current.on('confirmed', () => attachAudio(currentCallRef.current))
    } catch (e) { console.error('[SIP] answer error:', e) }
  }

  function handleHangup() {
    stopRingtone()
    try { currentCallRef.current?.terminate() } catch {}
    setCallState('idle')
    currentCallRef.current = null
  }

  function toggleMute() {
    const session = currentCallRef.current
    if (!session) return
    if (muted) { try { session.unmute({ audio: true }) } catch {} }
    else { try { session.mute({ audio: true }) } catch {} }
    setMuted((m: boolean) => !m)
  }

  function sendDtmf(key: string) {
    try { currentCallRef.current?.sendDTMF(key) } catch {}
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const T = theme

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ fontFamily: T.dark ? "'Georgia', serif" : "system-ui, sans-serif" }}>
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: T.panelText }}>Phone</h2>
          <p className="text-sm" style={{ color: T.panelSubtext }}>Browser-based softphone powered by WebRTC</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm" style={{ color: registered ? '#22C55E' : T.panelSubtext }}>
            {registered ? <Wifi size={14} /> : <WifiOff size={14} />}
            {registered ? 'Connected' : 'Not connected'}
          </div>
          <button
            onClick={() => setShowSettings((s: boolean) => !s)}
            className="px-3 py-1.5 text-sm rounded-lg transition"
            style={{ border: `1px solid ${T.panelBorder}`, background: T.panelBg, color: T.panelSubtext }}
          >
            Settings
          </button>
          <button
            onClick={handleReconnect}
            className="px-4 py-1.5 text-sm rounded-lg font-medium transition"
            style={{ background: T.reconnectBg, color: T.reconnectText }}
          >
            {connecting ? 'Connecting…' : registered ? 'Reconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl p-5 mb-6 shadow-sm" style={{ background: T.settingsBg, border: `1px solid ${T.settingsBorder}` }}>
          <h3 className="font-semibold mb-4" style={{ color: T.panelText }}>SIP Connection Settings</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {dbExtensions.map((e: any) => (
              <button
                key={e.id}
                onClick={() => { setExtension(e.extension_number); setPassword(e.sip_password || `UL${e.extension_number}secure!`) }}
                className="p-3 rounded-lg text-left transition"
                style={{
                  border: `2px solid ${extension === e.extension_number ? T.settingsSelectedBorder : T.settingsBorder}`,
                  background: extension === e.extension_number ? T.settingsSelectedBg : 'transparent',
                }}
              >
                <p className="font-semibold text-sm" style={{ color: T.settingsSelectedText }}>Ext. {e.extension_number}</p>
                <p className="text-xs mt-0.5" style={{ color: T.panelSubtext }}>{e.display_name}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Extension', value: extension, onChange: setExtension, type: 'text' },
              { label: 'Password', value: password, onChange: setPassword, type: 'password' },
              { label: 'SIP Domain', value: sipDomain, onChange: setSipDomain, type: 'text' },
            ].map(({ label, value, onChange, type }) => (
              <div key={label}>
                <label className="text-xs uppercase tracking-wide" style={{ color: T.panelSubtext }}>{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: `1px solid ${T.settingsBorder}`, background: T.settingsBg, color: T.panelText }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Dialpad */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: T.dialpadBg }}>
            <div className="px-6 pt-6 pb-4">
              {/* Extension + status */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium" style={{ color: T.dialpadSubtext }}>Your Extension</p>
                  <p className="font-bold text-lg" style={{ color: T.dialpadText }}>Ext. {extension || '—'}</p>
                </div>
                <div className="flex items-center gap-1" style={{ color: registered ? '#4ADE80' : T.dialpadSubtext }}>
                  {registered ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span className="text-xs">{registered ? 'Live' : 'Offline'}</span>
                </div>
              </div>

              {/* Display screen */}
              <div className="rounded-xl p-4 min-h-[80px] flex flex-col items-center justify-center" style={{ background: T.dialpadDisplayBg }}>
                {callState === 'idle' && (
                  <div className="text-center">
                    <p className="text-xl font-mono" style={{ color: dialNumber ? T.dialpadText : T.dialpadSubtext }}>{dialNumber || 'Enter number'}</p>
                    <p className="text-xs mt-1" style={{ color: T.dialpadSubtext }}>Ready</p>
                  </div>
                )}
                {callState === 'connecting' && (
                  <div className="text-center">
                    <p className="text-xl font-mono" style={{ color: T.dialpadText }}>{dialNumber}</p>
                    <p className="text-xs mt-1 animate-pulse" style={{ color: '#FBBF24' }}>Connecting…</p>
                  </div>
                )}
                {callState === 'ringing' && (
                  <div className="text-center">
                    <p className="text-xl font-mono" style={{ color: T.dialpadText }}>{dialNumber}</p>
                    <p className="text-xs mt-1 animate-pulse" style={{ color: T.dialpadSubtext }}>Ringing…</p>
                  </div>
                )}
                {callState === 'active' && (
                  <div className="text-center">
                    <p className="text-xl font-mono" style={{ color: T.dialpadText }}>{dialNumber || incomingFrom}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: '#4ADE80' }}>{fmt(callDuration)}</p>
                  </div>
                )}
                {callState === 'incoming' && (
                  <div className="text-center">
                    <p className="text-xs animate-pulse" style={{ color: T.callBtnBg }}>📞 Incoming Call</p>
                    <p className="text-lg font-bold mt-1" style={{ color: T.dialpadText }}>{incomingFrom}</p>
                    <p className="text-xs mt-1 animate-pulse" style={{ color: T.dialpadSubtext }}>Ringing…</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                  <button
                    key={key}
                    onClick={() => callState === 'active' ? sendDtmf(key) : setDialNumber((d: string) => d + key)}
                    className="font-bold text-lg py-3 rounded-xl transition active:scale-95"
                    style={{ background: T.dialpadKeyBg, color: T.dialpadText }}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              {callState === 'idle' && (
                <div className="flex gap-3">
                  <button
                    onClick={handleCall}
                    disabled={!dialNumber || !registered}
                    className="flex-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-40"
                    style={{ background: T.callBtnBg, color: T.callBtnText }}
                  >
                    <Phone size={20} /> Call
                  </button>
                  <button
                    onClick={() => setDialNumber((d: string) => d.slice(0, -1))}
                    className="px-4 rounded-xl transition"
                    style={{ background: T.dialpadKeyBg, color: T.dialpadText }}
                  >
                    <Delete size={18} />
                  </button>
                </div>
              )}

              {callState === 'incoming' && (
                <div className="flex gap-3">
                  <button
                    onClick={handleAnswer}
                    className="flex-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2 animate-pulse"
                    style={{ background: '#22C55E', color: '#FFFFFF' }}
                  >
                    <Phone size={20} /> Answer
                  </button>
                  <button
                    onClick={handleHangup}
                    className="flex-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                    style={{ background: '#EF4444', color: '#FFFFFF' }}
                  >
                    <PhoneOff size={20} /> Decline
                  </button>
                </div>
              )}

              {(callState === 'connecting' || callState === 'ringing' || callState === 'active') && (
                <div className="space-y-3">
                  {callState === 'active' && (
                    <div className="flex gap-2">
                      <button
                        onClick={toggleMute}
                        className="flex-1 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                        style={{ background: muted ? '#EF4444' : T.dialpadKeyBg, color: muted ? '#FFFFFF' : T.dialpadText }}
                      >
                        {muted ? <MicOff size={14} /> : <Mic size={14} />}
                        {muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button
                        onClick={() => setSpeakerOn((s: boolean) => !s)}
                        className="flex-1 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                        style={{ background: T.dialpadKeyBg, color: T.dialpadText }}
                      >
                        {speakerOn ? <Volume2 size={14} /> : <VolumeX size={14} />} Speaker
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleHangup}
                    className="w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                    style={{ background: '#EF4444', color: '#FFFFFF' }}
                  >
                    <PhoneOff size={20} />
                    {callState === 'active' ? 'End Call' : 'Cancel'}
                  </button>
                </div>
              )}

              {/* Status bar */}
              <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: T.statusBg }}>
                <div className={`w-2 h-2 rounded-full ${registered ? 'animate-pulse' : ''}`}
                  style={{ background: registered ? '#4ADE80' : T.dialpadSubtext }} />
                <span className="text-xs" style={{ color: T.statusText }}>
                  {registered ? `Ext ${extension} · WebRTC Connected` : 'Click Connect to activate'}
                </span>
              </div>
            </div>
          </div>

          {/* Ring Groups */}
          <div className="mt-4 rounded-xl shadow-sm p-4" style={{ background: T.panelBg, border: `1px solid ${T.panelBorder}` }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: T.panelText }}>Ring Groups</h3>
            <div className="space-y-2">
              {[{ name: 'All Staff', num: '2000' }, { name: 'Sales Team', num: '2001' }, { name: 'Support', num: '2002' }, { name: 'Management', num: '2003' }].map(({ name, num }) => (
                <button
                  key={num}
                  onClick={() => setDialNumber(num)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg transition text-left"
                  style={{ color: T.panelText }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.ringGroupDot }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{name}</p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: T.panelSubtext }}>{num}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Recent calls + Extensions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent calls */}
          <div className="rounded-xl shadow-sm" style={{ background: T.panelBg, border: `1px solid ${T.panelBorder}` }}>
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.panelBorder}` }}>
              <h3 className="font-semibold" style={{ color: T.panelText }}>Recent Calls</h3>
              <span className="text-xs" style={{ color: T.panelSubtext }}>Click to call back</span>
            </div>
            <div>
              {recentCalls.length > 0 ? recentCalls.map((cdr: any) => (
                <div
                  key={cdr.id}
                  className="p-4 flex items-center gap-4 cursor-pointer transition"
                  style={{ borderBottom: `1px solid ${T.panelBorder}` }}
                  onClick={() => setDialNumber(cdr.from_number)}
                >
                  <div className="p-2 rounded-lg" style={{ background: T.settingsSelectedBg }}>
                    <Phone size={16} style={{ color: T.accentBg }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: T.panelText }}>{cdr.from_number}</p>
                    {cdr.ai_summary && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: T.panelSubtext }}>{cdr.ai_summary}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: T.panelSubtext }}>{cdr.duration_sec}s</p>
                    <p className="text-xs" style={{ color: T.panelSubtext }}>{new Date(cdr.created_at).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); setDialNumber(cdr.from_number) }}
                    className="p-2 rounded-lg transition"
                    style={{ color: T.panelSubtext }}
                  >
                    <Phone size={14} />
                  </button>
                </div>
              )) : (
                <div className="text-center py-12" style={{ color: T.panelSubtext }}>
                  <Phone size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent calls</p>
                </div>
              )}
            </div>
          </div>

          {/* Extensions grid */}
          <div className="rounded-xl p-5 text-white" style={{ background: T.extCardBg }}>
            <h4 className="font-semibold mb-3" style={{ color: T.extCardText }}>Your Extensions</h4>
            <div className="grid grid-cols-2 gap-3">
              {dbExtensions.map((e: any) => (
                <div key={e.id} className="rounded-xl p-3" style={{ background: T.extCardItemBg }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm" style={{ color: T.extCardText }}>Ext. {e.extension_number}</span>
                    <span className="text-xs" style={{ color: T.extCardSubtext }}>{e.display_name}</span>
                  </div>
                  {e.direct_did && (
                    <p className="text-xs font-mono" style={{ color: T.extCardSubtext }}>{e.direct_did}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}