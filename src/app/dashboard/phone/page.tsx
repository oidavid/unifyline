'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Delete, Wifi, WifiOff, Grid3x3, Clock, Voicemail, Users, Settings as SettingsIcon, Hand } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming'
type Tab = 'keypad' | 'recent' | 'voicemail' | 'contacts' | 'settings'

const SIP_TRANSPORT_HOST = '198.58.114.103'
const WS_URL = `wss://${SIP_TRANSPORT_HOST}:7443`

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:198.58.114.103:3478', username: 'unifyline', credential: 'UnifyTurn2026!' },
  { urls: 'turns:198.58.114.103:5349', username: 'unifyline', credential: 'UnifyTurn2026!' },
]

// Theme definitions per tenant style
type Theme = {
  bg: string
  panel: string
  card: string
  accent: string
  accentDark: string
  text: string
  textMuted: string
  border: string
  btnBg: string
  navBg: string
  dark: boolean
}

const DARK_THEME: Theme = {
  bg: '#0A0A0A',
  panel: '#1C1813',
  card: '#2A2418',
  accent: '#E8C26A',
  accentDark: '#C9A23F',
  text: '#F7F5F0',
  textMuted: '#B8AE96',
  border: '#2A241A',
  btnBg: '#2A2418',
  navBg: '#0F0C08',
  dark: true,
}

const LIGHT_THEME: Theme = {
  bg: '#F8FAFC',
  panel: '#FFFFFF',
  card: '#F1F5F9',
  accent: '#0C2C68',
  accentDark: '#1A56C4',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  btnBg: '#E2E8F0',
  navBg: '#FFFFFF',
  dark: false,
}

function patchedCall<T>(fn: () => T): T {
  const NativePC = window.RTCPeerConnection
  function PatchedPC(this: any, config: RTCConfiguration) {
    return new NativePC({ ...config, iceServers: ICE_SERVERS, iceTransportPolicy: 'all' })
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

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'keypad', label: 'Keypad', icon: Grid3x3 },
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'voicemail', label: 'Voicemail', icon: Voicemail },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function DashboardPhone() {
  const [activeTab, setActiveTab] = useState<Tab>('keypad')
  const [callState, setCallState] = useState<CallState>('idle')
  const [showKeypadDuringCall, setShowKeypadDuringCall] = useState(false)
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
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [dbExtensions, setDbExtensions] = useState<any[]>([])
  const [accountId, setAccountId] = useState('')
  const [theme, setTheme] = useState<Theme>(LIGHT_THEME)
  const [ua, setUa] = useState<any>(null)
  const [directory, setDirectory] = useState<Record<string, string>>({})

  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentCallRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringtoneRef = useRef<{ start: () => void; stop: () => void } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadTenantData() }, [])

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
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
    } catch (e) { console.warn('[Ringtone] start error:', e) }
  }

  function stopRingtone() {
    try { ringtoneRef.current?.stop(); ringtoneRef.current = null } catch (e) { console.warn('[Ringtone] stop error:', e) }
  }

  async function loadTenantData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get account
      const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
      const accId = auData?.account_id || user.id
      setAccountId(accId)

      // Get account branding to determine theme
      const { data: account } = await supabase.from('accounts').select('brand_primary_color, sip_domain').eq('id', accId).single()
      const primaryColor = account?.brand_primary_color || '#0C2C68'
      const domain = account?.sip_domain || SIP_TRANSPORT_HOST

      // Dark theme for dark primary colors (MTI), light theme for blue (IntelSys)
      const isDark = primaryColor === '#1A1008' || primaryColor === '#0A0A0A' || primaryColor === '#1C1813'
      setTheme(isDark ? DARK_THEME : LIGHT_THEME)
      setSipDomain(domain)

      // Load extensions
      const { data: exts } = await supabase.from('extensions').select('*').eq('account_id', accId).order('extension_number')
      if (exts && exts.length > 0) {
        setDbExtensions(exts)
        setExtension(exts[0].extension_number)
        setPassword(exts[0].sip_password || `UL${exts[0].extension_number}secure!`)
        // Build directory
        const dir: Record<string, string> = {}
        exts.forEach(e => { dir[e.extension_number] = e.display_name })
        setDirectory(dir)
      }

      // Load recent calls
      const { data: calls } = await supabase
        .from('call_detail_records')
        .select('*')
        .eq('account_id', accId)
        .order('created_at', { ascending: false })
        .limit(20)
      setRecentCalls(calls || [])
    } catch (e) { console.error('[loadTenantData]', e) }
  }

  function callerLabel(num: string): { name: string; sub: string } {
    const known = directory[num]
    return known ? { name: known, sub: `Ext. ${num}` } : { name: num, sub: '' }
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
          session.on('ended', () => { setCallState('idle'); currentCallRef.current = null; loadTenantData() })
          session.on('failed', () => { setCallState('idle'); currentCallRef.current = null })
        } else {
          session.on('progress', () => setCallState('ringing'))
          session.on('accepted', () => setCallState('active'))
          session.on('ended', () => { setCallState('idle'); currentCallRef.current = null; loadTenantData() })
          session.on('failed', () => { setCallState('idle'); currentCallRef.current = null })
        }
      })

      userAgent.start()
      setUa(userAgent)
    } catch (e) {
      console.error('[SIP] init error:', e)
      setConnecting(false)
    }
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
      patchedCall(() => currentCallRef.current.answer({ mediaConstraints: { audio: true, video: false } }))
      setCallState('active')
    } catch (e) { console.error('[SIP] answer error:', e) }
  }

  function handleHangup() {
    try { currentCallRef.current?.terminate() } catch {}
    setCallState('idle')
    currentCallRef.current = null
  }

  function toggleMute() {
    const session = currentCallRef.current
    if (!session) return
    if (muted) { try { session.unmute({ audio: true }) } catch {} }
    else { try { session.mute({ audio: true }) } catch {} }
    setMuted(m => !m)
  }

  function toggleSpeaker() { setSpeakerOn(s => !s) }

  function sendDtmf(key: string) {
    try { currentCallRef.current?.sendDTMF(key) } catch {}
  }

  function callBack(num: string) {
    setDialNumber(num)
    setActiveTab('keypad')
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const T = theme

  const btn = (bg: string, color: string) => ({
    background: bg, color, border: 'none', borderRadius: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s',
  })

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: theme.dark ? "'Georgia', serif" : "system-ui, sans-serif" }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted, marginBottom: '2px' }}>Your Line</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: T.text }}>Ext. {extension || '—'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {registered ? (
              <div style={{ background: `${T.accent}22`, border: `1px solid ${T.accent}44`, borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.dark ? '#7FAE8E' : '#22C55E' }} />
                <span style={{ fontSize: '11px', color: T.accent, fontWeight: 600 }}>Live</span>
              </div>
            ) : (
              <button onClick={initSIP} disabled={connecting || !extension}
                style={{ ...btn(T.accent, theme.dark ? T.bg : '#FFFFFF'), padding: '8px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', opacity: connecting ? 0.6 : 1 }}>
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {activeTab === 'keypad' && (
            <div style={{ maxWidth: '360px', margin: '0 auto' }}>
              {/* Display */}
              <div style={{ background: T.panel, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: `1px solid ${T.border}` }}>
                {callState === 'idle' && (
                  <div style={{ fontFamily: theme.dark ? 'monospace' : 'inherit', fontSize: '28px', letterSpacing: '0.05em', color: dialNumber ? T.text : T.textMuted }}>
                    {dialNumber || 'Enter number'}
                  </div>
                )}
                {callState === 'connecting' && <div style={{ color: T.accent, fontSize: '15px' }}>Connecting…</div>}
                {callState === 'ringing' && (
                  <>
                    <div style={{ fontFamily: 'monospace', fontSize: '26px' }}>{dialNumber}</div>
                    <div style={{ color: T.accent, fontSize: '11px', marginTop: '6px' }}>Ringing…</div>
                  </>
                )}
                {callState === 'active' && (() => {
                  const target = dialNumber || incomingFrom
                  const { name, sub } = callerLabel(target)
                  return (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: 600 }}>{name}</div>
                      {sub && <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '2px' }}>{sub}</div>}
                      <div style={{ color: theme.dark ? '#7FAE8E' : '#22C55E', fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>{fmt(callDuration)}</div>
                    </>
                  )
                })()}
                {callState === 'incoming' && (() => {
                  const { name, sub } = callerLabel(incomingFrom)
                  return (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: T.accent, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incoming call</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>{name}</div>
                      {sub && <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '2px' }}>{sub}</div>}
                    </div>
                  )
                })()}
              </div>

              {callState === 'idle' && !showKeypadDuringCall && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                      <button key={key} onClick={() => setDialNumber(d => d + key)}
                        style={{ ...btn(T.card, T.text), padding: '18px 0', fontSize: '19px', fontWeight: 600, border: `1px solid ${T.border}` }}>
                        {key}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleCall} disabled={!dialNumber || !registered}
                      style={{ ...btn(dialNumber && registered ? T.accent : T.card, dialNumber && registered ? (theme.dark ? T.bg : '#FFFFFF') : T.textMuted), flex: 1, padding: '16px', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, gap: '8px' }}>
                      <Phone size={16} /> Call
                    </button>
                    <button onClick={() => setDialNumber(d => d.slice(0, -1))}
                      style={{ ...btn(T.card, T.text), width: '54px', border: `1px solid ${T.border}` }}>
                      <Delete size={16} />
                    </button>
                  </div>
                </>
              )}

              {callState === 'incoming' && (
                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 0' }}>
                  <RoundButton icon={<PhoneOff size={26} />} label="Decline" bg="#9A3F3F" onClick={handleHangup} />
                  <RoundButton icon={<Phone size={26} />} label="Answer" bg={T.accent} fg={theme.dark ? T.bg : '#FFFFFF'} onClick={handleAnswer} />
                </div>
              )}

              {(callState === 'connecting' || callState === 'ringing' || callState === 'active') && (
                <div>
                  {callState === 'active' && !showKeypadDuringCall && (
                    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 24px' }}>
                      <RoundButton icon={muted ? <MicOff size={22} /> : <Mic size={22} />} label={muted ? 'Unmute' : 'Mute'} bg={muted ? T.accent : T.card} fg={muted ? (theme.dark ? T.bg : '#FFFFFF') : T.text} onClick={toggleMute} small />
                      <RoundButton icon={<Hand size={22} />} label="Hold" bg={T.card} fg={T.textMuted} onClick={() => {}} small disabled />
                      <RoundButton icon={speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />} label="Speaker" bg={!speakerOn ? T.accent : T.card} fg={!speakerOn ? (theme.dark ? T.bg : '#FFFFFF') : T.text} onClick={toggleSpeaker} small />
                    </div>
                  )}
                  {callState === 'active' && showKeypadDuringCall && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                        <button key={key} onClick={() => sendDtmf(key)}
                          style={{ ...btn(T.card, T.text), padding: '14px 0', fontSize: '17px', fontWeight: 600 }}>
                          {key}
                        </button>
                      ))}
                    </div>
                  )}
                  {callState === 'active' && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                      <RoundButton icon={<Grid3x3 size={20} />} label="Keypad" bg={showKeypadDuringCall ? T.accent : T.card} fg={showKeypadDuringCall ? (theme.dark ? T.bg : '#FFFFFF') : T.text} onClick={() => setShowKeypadDuringCall(s => !s)} small />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <RoundButton icon={<PhoneOff size={26} />} label={callState === 'active' ? 'End Call' : 'Cancel'} bg="#9A3F3F" onClick={handleHangup} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recent' && (
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted, fontWeight: 700, marginBottom: '16px' }}>Recent Calls</div>
              {recentCalls.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentCalls.map((cdr: any) => (
                    <div key={cdr.id} onClick={() => callBack(cdr.from_number)}
                      style={{ background: T.panel, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderRadius: '12px', border: `1px solid ${T.border}` }}>
                      <Phone size={16} style={{ color: T.accent, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{cdr.from_number}</div>
                        {cdr.ai_summary && <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cdr.ai_summary}</div>}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: T.textMuted, flexShrink: 0 }}>
                        <div>{cdr.duration_sec}s</div>
                        <div>{new Date(cdr.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '64px 24px', color: T.textMuted }}>
                  <Clock size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px' }}>No recent calls</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted, fontWeight: 700, marginBottom: '16px' }}>Extensions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                {dbExtensions.map(e => (
                  <button key={e.id} onClick={() => { setExtension(e.extension_number); setPassword(e.sip_password || 'ULdefault!') }}
                    style={{ ...btn(extension === e.extension_number ? T.accent : T.panel, extension === e.extension_number ? (theme.dark ? T.bg : '#FFFFFF') : T.text), padding: '14px', textAlign: 'left', border: `2px solid ${extension === e.extension_number ? T.accent : T.border}`, borderRadius: '12px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>Ext. {e.extension_number}</span>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{e.display_name}</span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted, fontWeight: 700, marginBottom: '12px' }}>Connection</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '4px' }}>Extension</label>
                  <input value={extension} onChange={e => setExtension(e.target.value)}
                    style={{ width: '100%', background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px 12px', color: T.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '4px' }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px 12px', color: T.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: T.textMuted, display: 'block', marginBottom: '4px' }}>SIP Domain</label>
                  <input value={sipDomain} onChange={e => setSipDomain(e.target.value)}
                    style={{ width: '100%', background: T.panel, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '10px 12px', color: T.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={initSIP} disabled={connecting || !extension}
                  style={{ ...btn(T.accent, theme.dark ? T.bg : '#FFFFFF'), padding: '14px', fontWeight: 700, fontSize: '13px', letterSpacing: '0.05em', marginTop: '4px', opacity: connecting ? 0.6 : 1 }}>
                  {connecting ? 'Connecting…' : registered ? 'Re-connect' : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'voicemail' && <ComingSoon icon={Voicemail} label="Voicemail" note="Voicemail messages will appear here." color={T.textMuted} accent={T.accent} />}
          {activeTab === 'contacts' && <ComingSoon icon={Users} label="Contacts" note="Saved contacts will appear here soon." color={T.textMuted} accent={T.accent} />}
        </main>

        {/* Bottom tab bar */}
        <nav style={{ display: 'flex', borderTop: `1px solid ${T.border}`, background: T.navBg }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{
                flex: 1, background: 'transparent', border: 'none', padding: '12px 0 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                color: activeTab === key ? T.accent : T.textMuted, cursor: 'pointer',
              }}>
              <Icon size={20} />
              <span style={{ fontSize: '10px', letterSpacing: '0.02em' }}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
    </div>
  )
}

function RoundButton({ icon, label, bg, fg = '#FFFFFF', onClick, small, disabled }: {
  icon: React.ReactNode; label: string; bg: string; fg?: string
  onClick: () => void; small?: boolean; disabled?: boolean
}) {
  const size = small ? 56 : 72
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        {icon}
      </div>
      <span style={{ fontSize: '11px', letterSpacing: '0.02em' }}>{label}</span>
    </button>
  )
}

function ComingSoon({ icon: Icon, label, note, color, accent }: { icon: any; label: string; note: string; color: string; accent: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color }}>
      <Icon size={32} style={{ opacity: 0.3, marginBottom: '12px', color: accent }} />
      <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px' }}>{note}</div>
    </div>
  )
}
