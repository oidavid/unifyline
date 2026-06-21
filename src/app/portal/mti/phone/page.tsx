'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Delete, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming'

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

const GOLD = '#D4B483'
const BLACK = '#0A0A0A'
const IVORY = '#F7F5F0'
const INK = '#1C1C1C'
const TAUPE = '#8A8378'

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
  const [callState, setCallState] = useState<CallState>('idle')
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
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
      ringtoneRef.current = createRingtone(audioCtxRef.current)
      ringtoneRef.current.start()
    } catch (e) { console.warn('[Ringtone] failed to start:', e) }
  }

  function stopRingtone() {
    try { ringtoneRef.current?.stop(); ringtoneRef.current = null } catch (e) { console.warn('[Ringtone] failed to stop:', e) }
  }

  async function loadRecentCalls() {
    try {
      const { data } = await supabase
        .from('call_detail_records')
        .select('*')
        .eq('account_id', MTI_ACCOUNT_ID)
        .order('created_at', { ascending: false })
        .limit(8)
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
        register_expires: 300,
        session_timers: false,
      })

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
          currentCallRef.current = session
          session.on('ended', () => {
            stopRingtone(); setCallState('idle'); currentCallRef.current = null; loadRecentCalls()
          })
          session.on('failed', () => {
            stopRingtone(); setCallState('idle'); currentCallRef.current = null
          })
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
    currentCallRef.current = null
  }

  function toggleMute() {
    const session = currentCallRef.current
    if (!session) return
    if (muted) session.unmute({ audio: true })
    else session.mute({ audio: true })
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

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const btn = (bg: string, color: string) => ({
    background: bg, color, border: 'none', borderRadius: '10px',
    fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 0 rgba(0,0,0,0.4)', cursor: 'pointer',
  })

  return (
    <div style={{ minHeight: '100vh', background: IVORY, color: INK, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <audio ref={audioRef} autoPlay />

      <header style={{ background: BLACK, padding: '24px 40px', borderBottom: `3px solid ${GOLD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
          MTI Premium Charters &middot; Line
        </div>
        {registered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Arial, sans-serif', fontSize: '12px', color: GOLD }}>
            <Wifi size={13} /> Live
          </div>
        )}
      </header>

      <main style={{ padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
        {!registered ? (
          <div style={{ maxWidth: '420px', margin: '0 auto', background: '#FFFFFF', border: '1px solid #E5E0D5', borderTop: `3px solid ${GOLD}`, borderRadius: '10px', padding: '36px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE, fontWeight: 700, marginBottom: '8px' }}>
              Line Setup
            </div>
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
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
            <div style={{ background: BLACK, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE }}>Your Line</div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px' }}>Ext. {extension}</div>
                </div>
              </div>

              <div style={{ background: '#15120D', borderRadius: '8px', padding: '20px', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                {callState === 'idle' && (<><div style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '22px' }}>{dialNumber || 'Enter number'}</div><div style={{ color: GOLD, fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '6px' }}>Ready</div></>)}
                {callState === 'connecting' && (<><div style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '22px' }}>{dialNumber}</div><div style={{ color: '#E0B85C', fontFamily: 'Arial, sans-serif', fontSize: '11px', marginTop: '6px' }}>Connecting…</div></>)}
                {callState === 'ringing' && (<><div style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '22px' }}>{dialNumber}</div><div style={{ color: GOLD, fontFamily: 'Arial, sans-serif', fontSize: '11px', marginTop: '6px' }}>Ringing…</div></>)}
                {callState === 'active' && (<><div style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '22px' }}>{dialNumber || incomingFrom}</div><div style={{ color: '#7FAE8E', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 700, marginTop: '6px' }}>{fmt(callDuration)}</div></>)}
                {callState === 'incoming' && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: GOLD, fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Incoming call</div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '4px' }}>{incomingFrom}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                  <button key={key} onClick={() => callState === 'active' ? sendDtmf(key) : setDialNumber(d => d + key)}
                    style={{ ...btn('#1F1B14', '#FFFFFF'), padding: '16px 0', fontSize: '18px', fontWeight: 600 }}>
                    {key}
                  </button>
                ))}
              </div>

              {callState === 'idle' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleCall} disabled={!dialNumber || !registered}
                    style={{ ...btn(dialNumber ? GOLD : '#3A3328', BLACK), flex: 1, padding: '15px', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Phone size={16} /> Call
                  </button>
                  <button onClick={() => setDialNumber(d => d.slice(0, -1))}
                    style={{ ...btn('#1F1B14', '#FFFFFF'), width: '52px', padding: '15px 0' }}>
                    <Delete size={16} />
                  </button>
                </div>
              )}

              {callState === 'incoming' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleAnswer} style={{ ...btn(GOLD, BLACK), flex: 1, padding: '15px', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Phone size={16} /> Answer
                  </button>
                  <button onClick={handleHangup} style={{ ...btn('#9A3F3F', '#FFFFFF'), flex: 1, padding: '15px', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <PhoneOff size={16} /> Decline
                  </button>
                </div>
              )}

              {(callState === 'connecting' || callState === 'ringing' || callState === 'active') && (
                <div>
                  {callState === 'active' && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <button onClick={toggleMute}
                        style={{ ...btn(muted ? GOLD : '#1F1B14', muted ? BLACK : '#FFFFFF'), flex: 1, padding: '12px', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {muted ? <MicOff size={14} /> : <Mic size={14} />} {muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button onClick={toggleSpeaker}
                        style={{ ...btn(!speakerOn ? GOLD : '#1F1B14', !speakerOn ? BLACK : '#FFFFFF'), flex: 1, padding: '12px', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {speakerOn ? <Volume2 size={14} /> : <VolumeX size={14} />} Speaker
                      </button>
                    </div>
                  )}
                  <button onClick={handleHangup}
                    style={{ ...btn('#9A3F3F', '#FFFFFF'), width: '100%', padding: '15px', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <PhoneOff size={16} /> {callState === 'active' ? 'Hang Up' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E5E0D5', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #ECE7DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE, fontWeight: 700 }}>Recent Calls</div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#A8A296' }}>Click to call back</div>
              </div>
              {recentCalls.length > 0 ? recentCalls.map((cdr: any) => (
                <div key={cdr.id} style={{ padding: '16px 22px', borderBottom: '1px solid #F2EFE6', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', color: INK }}>{cdr.from_number}</div>
                    {cdr.ai_summary && <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: TAUPE, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cdr.ai_summary}</div>}
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#A8A296', flexShrink: 0 }}>
                    <div>{cdr.duration_sec}s</div>
                    <div>{new Date(cdr.created_at).toLocaleTimeString()}</div>
                  </div>
                  <button onClick={() => setDialNumber(cdr.from_number)} style={{ background: 'transparent', border: 'none', color: GOLD, cursor: 'pointer', flexShrink: 0 }}>
                    <Phone size={15} />
                  </button>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#A8A296' }}>
                  <Phone size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>No recent calls</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#A8A296' }}>
          MTI Premium Charters &middot; Powered by UnifyLine
        </div>
      </main>
    </div>
  )
}
