'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Delete, Wifi, Grid3x3, Clock, Voicemail, Users, Settings as SettingsIcon, Hand } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming'
type Tab = 'keypad' | 'recent' | 'voicemail' | 'contacts' | 'settings'

const MTI_SIP_DOMAIN = 'mti.unifyline.local'
const SIP_TRANSPORT_HOST = '198.58.114.103'
const WS_URL = `wss://${SIP_TRANSPORT_HOST}:7443`
const MTI_ACCOUNT_ID = '5f646bc2-9bf3-47cb-9859-2871d4322e19'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:198.58.114.103:3478' },
  { urls: 'turn:198.58.114.103:3478', username: 'unifyline', credential: 'UnifyTurn2026!' },
  { urls: 'turns:198.58.114.103:5349', username: 'unifyline', credential: 'UnifyTurn2026!' },
]

const MTI_DIRECTORY: Record<string, string> = {
  '201': 'Osas David',
  '202': 'MTI Test Line',
}

function callerLabel(num: string): { name: string; sub: string } {
  const known = MTI_DIRECTORY[num]
  return known ? { name: known, sub: `Ext. ${num}` } : { name: num, sub: '' }
}

const GOLD = '#E8C26A'
const GOLD_DARK = '#C9A23F'
const BLACK = '#0A0A0A'
const IVORY = '#F7F5F0'
const INK = '#1C1C1C'
const TAUPE = '#B8AE96'
const PANEL = '#1C1813'

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

export default function MTIPortalPhone() {
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
  const [registered, setRegistered] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [ua, setUa] = useState<any>(null)

  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentCallRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringtoneRef = useRef<{ start: () => void; stop: () => void } | null>(null)
  const supabase = createClient()

  useEffect(() => { loadRecentCalls() }, [])

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

  async function loadRecentCalls() {
    try {
      const { data } = await supabase
        .from('call_detail_records')
        .select('*')
        .eq('account_id', MTI_ACCOUNT_ID)
        .order('created_at', { ascending: false })
        .limit(20)
      setRecentCalls(data || [])
    } catch {}
  }

  async function initSIP() {
    if (!extension || !password) return
    setConnecting(true)
    try {
      const JsSIP = await import('jssip')
      const socket = new JsSIP.WebSocketInterface(WS_URL)
      const userAgent = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${extension}@${MTI_SIP_DOMAIN}`,
        password,
        display_name: `MTI Ext ${extension}`,
        register: true,
        register_expires: 60,
        session_timers: false,
      })

      // Unregister cleanly when the browser tab closes or refreshes
      const cleanup = () => { try { userAgent.unregister({ all: true }) } catch {} }
      window.addEventListener('beforeunload', cleanup)

      let staleContactsFlushed = false
      userAgent.on('registered', () => {
        setRegistered(true)
        setConnecting(false)
        if (!staleContactsFlushed) {
          staleContactsFlushed = true
          try {
            userAgent.unregister({ all: true })
            setTimeout(() => { try { userAgent.register() } catch {} }, 800)
          } catch {}
        }
      })
      userAgent.on('unregistered', () => { setRegistered(false); setConnecting(false) })
      userAgent.on('registrationFailed', () => { setRegistered(false); setConnecting(false) })

      userAgent.on('newRTCSession', (e: any) => {
        const session = e.session
        if (session.direction === 'incoming') {
          setIncomingFrom(e.request.from.display_name || e.request.from.uri.user)
          setCallState('incoming')
          setActiveTab('keypad')
          currentCallRef.current = session
          session.on('ended', () => { stopRingtone(); setCallState('idle'); setDialNumber(''); currentCallRef.current = null; loadRecentCalls() })
          session.on('failed', () => { stopRingtone(); setCallState('idle'); setDialNumber(''); currentCallRef.current = null })
        }
      })

      userAgent.start()
      setUa(userAgent)
    } catch (err) {
      console.error('[MTI Portal Phone] Init error:', err)
      setConnecting(false)
    }
  }

  function attachAudio(session: any) {
    try {
      if (session?.connection && audioRef.current) {
        const remoteStream = new MediaStream()
        session.connection.getReceivers().forEach((r: any) => { if (r.track) remoteStream.addTrack(r.track) })
        audioRef.current.srcObject = remoteStream
        audioRef.current.muted = !speakerOn
        audioRef.current.play().catch((e: any) => console.warn('[Audio]', e))
      }
    } catch (e) { console.warn('[Audio] attach error:', e) }
  }

  function handleCall() {
    if (!dialNumber || !ua) return
    const target = `sip:${dialNumber}@${MTI_SIP_DOMAIN}`
    const session = patchedCall(() => ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      sessionTimersExpires: 120,
    }))
    currentCallRef.current = session
    setCallState('connecting')
    session.on('progress', () => setCallState('ringing'))
    session.on('accepted', () => { setCallState('active'); attachAudio(session) })
    session.on('confirmed', () => { setCallState('active'); attachAudio(session) })
    session.on('ended', () => { setCallState('idle'); currentCallRef.current = null; loadRecentCalls() })
    session.on('failed', () => { setCallState('idle'); currentCallRef.current = null })
  }

  function handleAnswer() {
    const session = currentCallRef.current
    if (!session) return
    stopRingtone()
    patchedCall(() => session.answer({ mediaConstraints: { audio: true, video: false } }))
    setCallState('active')
    session.on('confirmed', () => attachAudio(session))
    session.connection?.addEventListener('track', () => attachAudio(session))
  }

  function handleHangup() {
    stopRingtone()
    const session = currentCallRef.current
    if (session) { try { session.terminate() } catch {} }
    setCallState('idle')
    setShowKeypadDuringCall(false)
    setDialNumber('')
    currentCallRef.current = null
  }

  function toggleMute() {
    const session = currentCallRef.current
    if (!session) return
    if (muted) session.unmute({ audio: true }); else session.mute({ audio: true })
    setMuted(!muted)
  }

  function toggleSpeaker() {
    const next = !speakerOn
    setSpeakerOn(next)
    if (audioRef.current) audioRef.current.muted = !next
  }

  function sendDtmf(tone: string) {
    try { currentCallRef.current?.sendDTMF(tone) } catch (e) { console.warn('[DTMF] error:', e) }
  }

  function callBack(num: string) {
    setDialNumber(num)
    setActiveTab('keypad')
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const btn = (bg: string, color: string) => ({
    background: bg, color, border: 'none', borderRadius: '10px',
    fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 0 rgba(0,0,0,0.4)', cursor: 'pointer',
  })

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'keypad', label: 'Keypad', icon: Grid3x3 },
    { key: 'recent', label: 'Recent', icon: Clock },
    { key: 'voicemail', label: 'Voicemail', icon: Voicemail },
    { key: 'contacts', label: 'Contacts', icon: Users },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  // ---- Setup / connect screen (shown before registration) ----
  if (!registered) {
    return (
      <div style={{ minHeight: '100vh', background: IVORY, color: INK, fontFamily: 'Georgia, "Times New Roman", serif' }}>
        <audio ref={audioRef} autoPlay />
        <header style={{ background: BLACK, padding: '24px 40px', borderBottom: `3px solid ${GOLD}` }}>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
            MTI Premium Charters &middot; Line
          </div>
        </header>
        <main style={{ padding: '48px 24px', maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E0D5', borderTop: `3px solid ${GOLD}`, borderRadius: '10px', padding: '36px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE, fontWeight: 700, marginBottom: '8px' }}>Line Setup</div>
            <h1 style={{ fontSize: '22px', fontWeight: 'normal', margin: '0 0 28px' }}>Connect your line</h1>
            <label style={{ display: 'block', fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5448', fontWeight: 700, marginBottom: '8px' }}>Extension</label>
            <input value={extension} onChange={e => setExtension(e.target.value)} placeholder="e.g. 201"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '15px', fontFamily: 'Arial, sans-serif', border: '1px solid #D8D2C4', borderRadius: '8px', marginBottom: '16px' }} />
            <label style={{ display: 'block', fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5448', fontWeight: 700, marginBottom: '8px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '15px', fontFamily: 'Arial, sans-serif', border: '1px solid #D8D2C4', borderRadius: '8px', marginBottom: '24px' }} />
            <button onClick={initSIP} disabled={connecting || !extension || !password}
              style={{
                width: '100%', padding: '14px',
                background: connecting || !extension || !password ? '#E8E2D4' : BLACK,
                color: connecting || !extension || !password ? '#A8A296' : GOLD,
                border: connecting || !extension || !password ? '1px solid #D8D2C4' : 'none',
                borderRadius: '8px', fontFamily: 'Arial, sans-serif', fontSize: '13px',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                cursor: connecting || !extension || !password ? 'default' : 'pointer',
              }}>
              {connecting ? 'Connecting...' : 'Connect Line'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ---- Main app shell with tab navigation (mirrors mobile app structure) ----
  return (
    <div style={{ minHeight: '100vh', background: IVORY, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px' }}>
      <audio ref={audioRef} autoPlay />

      <div style={{ width: '100%', maxWidth: '420px', background: BLACK, color: '#FFFFFF', fontFamily: 'Arial, sans-serif', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: `1px solid #2A241A`, height: '730px', display: 'flex', flexDirection: 'column' }}>

        <header style={{ padding: '20px 24px 16px', borderBottom: `1px solid #2A241A` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE }}>Your Line</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px' }}>Ext. {extension}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2A2418', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', color: GOLD }}>
              <Wifi size={13} /> Live
            </div>
          </div>
        </header>

        <main style={{ padding: '24px', flex: 1, overflowY: 'hidden' }}>
        {activeTab === 'keypad' && (
          <div style={{ maxWidth: '380px', margin: '0 auto' }}>
            <div style={{ background: PANEL, borderRadius: '12px', padding: '24px', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              {callState === 'idle' && (<><div style={{ fontFamily: 'monospace', fontSize: '26px' }}>{dialNumber || 'Enter number'}</div><div style={{ color: GOLD, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '6px' }}>Ready</div></>)}
              {callState === 'connecting' && (<><div style={{ fontFamily: 'monospace', fontSize: '26px' }}>{dialNumber}</div><div style={{ color: '#E0B85C', fontSize: '11px', marginTop: '6px' }}>Connecting…</div></>)}
              {callState === 'ringing' && (<><div style={{ fontFamily: 'monospace', fontSize: '26px' }}>{dialNumber}</div><div style={{ color: GOLD, fontSize: '11px', marginTop: '6px' }}>Ringing…</div></>)}
              {callState === 'active' && (() => {
                const target = dialNumber || incomingFrom
                const { name, sub } = callerLabel(target)
                return (
                  <>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px' }}>{name}</div>
                    {sub && <div style={{ fontSize: '11px', color: TAUPE, marginTop: '2px' }}>{sub}</div>}
                    <div style={{ color: '#7FAE8E', fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>{fmt(callDuration)}</div>
                  </>
                )
              })()}
              {callState === 'incoming' && (() => {
                const { name, sub } = callerLabel(incomingFrom)
                return (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: GOLD, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incoming call</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', marginTop: '4px' }}>{name}</div>
                    {sub && <div style={{ fontSize: '11px', color: TAUPE, marginTop: '2px' }}>{sub}</div>}
                  </div>
                )
              })()}
            </div>

            {callState === 'idle' && !showKeypadDuringCall && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                    <button key={key} onClick={() => setDialNumber(d => d + key)}
                      style={{ ...btn('#2A2418', '#FFFFFF'), padding: '18px 0', fontSize: '19px', fontWeight: 600 }}>
                      {key}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleCall} disabled={!dialNumber}
                    style={{ ...btn(dialNumber ? GOLD : '#2A2418', dialNumber ? BLACK : '#8A8170'), flex: 1, padding: '16px', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Phone size={16} /> Call
                  </button>
                  <button onClick={() => setDialNumber(d => d.slice(0, -1))} style={{ ...btn('#2A2418', '#FFFFFF'), width: '54px' }}>
                    <Delete size={16} />
                  </button>
                </div>
              </>
            )}

            {callState === 'incoming' && (
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '20px 0' }}>
                <RoundButton icon={<PhoneOff size={26} />} label="Decline" bg="#9A3F3F" onClick={handleHangup} />
                <RoundButton icon={<Phone size={26} />} label="Answer" bg={GOLD} fg={BLACK} onClick={handleAnswer} />
              </div>
            )}

            {(callState === 'connecting' || callState === 'ringing' || callState === 'active') && (
              <div>
                {callState === 'active' && !showKeypadDuringCall && (
                  <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 24px' }}>
                    <RoundButton icon={muted ? <MicOff size={22} /> : <Mic size={22} />} label={muted ? 'Unmute' : 'Mute'} bg={muted ? GOLD : '#2A2418'} fg={muted ? BLACK : '#FFFFFF'} onClick={toggleMute} small />
                    <RoundButton icon={<Hand size={22} />} label="Hold" bg="#2A2418" fg="#5A5448" onClick={() => {}} small disabled />
                    <RoundButton icon={speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />} label="Speaker" bg={!speakerOn ? GOLD : '#2A2418'} fg={!speakerOn ? BLACK : '#FFFFFF'} onClick={toggleSpeaker} small />
                  </div>
                )}

                {callState === 'active' && showKeypadDuringCall && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                      <button key={key} onClick={() => sendDtmf(key)}
                        style={{ ...btn('#2A2418', '#FFFFFF'), padding: '14px 0', fontSize: '17px', fontWeight: 600 }}>
                        {key}
                      </button>
                    ))}
                  </div>
                )}

                {callState === 'active' && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <RoundButton icon={<Grid3x3 size={20} />} label="Keypad" bg={showKeypadDuringCall ? GOLD : '#2A2418'} fg={showKeypadDuringCall ? BLACK : '#FFFFFF'} onClick={() => setShowKeypadDuringCall(s => !s)} small />
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
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE, fontWeight: 700, marginBottom: '16px' }}>Recent Calls</div>
            {recentCalls.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {recentCalls.map((cdr: any) => (
                  <div key={cdr.id} onClick={() => callBack(cdr.from_number)}
                    style={{ background: PANEL, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', borderRadius: '8px', marginBottom: '8px' }}>
                    <Phone size={16} style={{ color: GOLD, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px' }}>{cdr.from_number}</div>
                      {cdr.ai_summary && <div style={{ fontSize: '12px', color: TAUPE, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cdr.ai_summary}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#C4BBA6', flexShrink: 0 }}>
                      <div>{cdr.duration_sec}s</div>
                      <div>{new Date(cdr.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: '#5A5448' }}>
                <Clock size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <div style={{ fontSize: '13px' }}>No recent calls</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voicemail' && <ComingSoon icon={Voicemail} label="Voicemail" note="A portal view of your messages is on the way." />}
        {activeTab === 'contacts' && <ComingSoon icon={Users} label="Contacts" note="Saved contacts will appear here soon." />}
        {activeTab === 'settings' && <ComingSoon icon={SettingsIcon} label="Settings" note="Line preferences and account settings are on the way." />}
      </main>

      {/* Bottom tab bar - mirrors the mobile app's structure */}
      <nav style={{ display: 'flex', borderTop: '1px solid #2A241A', background: '#0F0C08' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{
              flex: 1, background: 'transparent', border: 'none', padding: '12px 0 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              color: activeTab === key ? GOLD : '#D4CCB8', cursor: 'pointer',
            }}>
            <Icon size={20} />
            <span style={{ fontSize: '10px', letterSpacing: '0.02em' }}>{label}</span>
          </button>
        ))}
      </nav>
      </div>
    </div>
  )
}

function RoundButton({ icon, label, bg, fg = '#FFFFFF', onClick, small, disabled }: { icon: React.ReactNode; label: string; bg: string; fg?: string; onClick: () => void; small?: boolean; disabled?: boolean }) {
  const size = small ? 56 : 72
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        {icon}
      </div>
      <span style={{ fontSize: '11px', color: '#A8A296', letterSpacing: '0.02em' }}>{label}</span>
    </button>
  )
}

function ComingSoon({ icon: Icon, label, note }: { icon: any; label: string; note: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#5A5448' }}>
      <Icon size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#C4BBA6', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px' }}>{note}</div>
    </div>
  )
}
