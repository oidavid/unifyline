'use client'
import { useState, useEffect, useRef } from 'react'

const MTI_SIP_DOMAIN = 'mti.unifyline.local'
const SIP_TRANSPORT_HOST = '198.58.114.103'
const WS_URL = `wss://${SIP_TRANSPORT_HOST}:7443`

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

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'incoming'

const GOLD = '#D4B483'
const BLACK = '#0A0A0A'
const IVORY = '#F7F5F0'
const INK = '#1C1C1C'
const TAUPE = '#8A8378'

export default function MTIPortalPhone() {
  const [extension, setExtension] = useState('')
  const [password, setPassword] = useState('')
  const [registered, setRegistered] = useState(false)
  const [callState, setCallState] = useState<CallState>('idle')
  const [dialNumber, setDialNumber] = useState('')
  const [muted, setMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [incomingFrom, setIncomingFrom] = useState('')
  const [ua, setUa] = useState<any>(null)
  const [currentCall, setCurrentCall] = useState<any>(null)
  const [connecting, setConnecting] = useState(false)

  const timerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentCallRef = useRef<any>(null)

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setCallDuration(0)
    }
    return () => clearInterval(timerRef.current)
  }, [callState])

  function fmt(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
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

      userAgent.on('registered', () => { setRegistered(true); setConnecting(false) })
      userAgent.on('unregistered', () => { setRegistered(false); setConnecting(false) })
      userAgent.on('registrationFailed', () => { setRegistered(false); setConnecting(false) })

      userAgent.on('newRTCSession', (e: any) => {
        const session = e.session
        if (session.direction === 'incoming') {
          setIncomingFrom(e.request.from.display_name || e.request.from.uri.user)
          setCallState('incoming')
          setCurrentCall(session)
          currentCallRef.current = session
          session.on('ended', () => { setCallState('idle'); setCurrentCall(null); currentCallRef.current = null })
          session.on('failed', () => { setCallState('idle'); setCurrentCall(null); currentCallRef.current = null })
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
        audioRef.current.play().catch(() => {})
      }
    } catch {}
  }

  function handleCall() {
    if (!dialNumber || !ua) return
    const target = `sip:${dialNumber}@${MTI_SIP_DOMAIN}`
    const session = patchedCall(() => ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      sessionTimersExpires: 120,
    }))
    setCurrentCall(session)
    currentCallRef.current = session
    setCallState('connecting')

    session.on('progress', () => setCallState('ringing'))
    session.on('accepted', () => { setCallState('active'); attachAudio(session) })
    session.on('confirmed', () => attachAudio(session))
    session.on('ended', () => { setCallState('idle'); setCurrentCall(null); currentCallRef.current = null })
    session.on('failed', () => { setCallState('idle'); setCurrentCall(null); currentCallRef.current = null })
  }

  function handleAnswer() {
    const session = currentCallRef.current
    if (!session) return
    patchedCall(() => session.answer({
      mediaConstraints: { audio: true, video: false },
    }))
    setCallState('active')
    attachAudio(session)
  }

  function handleHangup() {
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
    if (muted) { session.unmute({ audio: true }) } else { session.mute({ audio: true }) }
    setMuted(!muted)
  }

  function pressDigit(d: string) {
    if (callState === 'active' && currentCallRef.current) {
      currentCallRef.current.sendDTMF(d)
    } else {
      setDialNumber(prev => prev + d)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: IVORY, color: INK, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <audio ref={audioRef} autoPlay />

      <header style={{ background: BLACK, padding: '24px 40px', borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
          MTI Premium Charters &middot; Line
        </div>
      </header>

      <main style={{ padding: '48px 24px', maxWidth: '440px', margin: '0 auto' }}>
        {!registered ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E0D5', borderTop: `3px solid ${GOLD}`, borderRadius: '10px', padding: '36px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE, fontWeight: 700, marginBottom: '8px' }}>
              Line Setup
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 'normal', margin: '0 0 28px' }}>Connect your line</h1>

            <label style={{ display: 'block', fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5448', fontWeight: 700, marginBottom: '8px' }}>
              Extension
            </label>
            <input
              value={extension}
              onChange={e => setExtension(e.target.value)}
              placeholder="e.g. 201"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '15px', fontFamily: 'Arial, sans-serif', border: '1px solid #D8D2C4', borderRadius: '8px', marginBottom: '16px' }}
            />

            <label style={{ display: 'block', fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5448', fontWeight: 700, marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '15px', fontFamily: 'Arial, sans-serif', border: '1px solid #D8D2C4', borderRadius: '8px', marginBottom: '24px' }}
            />

            <button
              onClick={initSIP}
              disabled={connecting || !extension || !password}
              style={{
                width: '100%', padding: '14px', background: connecting || !extension || !password ? '#E8E2D4' : BLACK,
                color: connecting || !extension || !password ? '#A8A296' : GOLD, border: connecting || !extension || !password ? '1px solid #D8D2C4' : 'none',
                borderRadius: '8px', fontFamily: 'Arial, sans-serif', fontSize: '13px',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                cursor: connecting || !extension || !password ? 'default' : 'pointer',
              }}
            >
              {connecting ? 'Connecting...' : 'Connect Line'}
            </button>
          </div>
        ) : (
          <div style={{ background: BLACK, padding: '28px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TAUPE }}>
                  Your Line
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '18px' }}>Ext. {extension}</div>
              </div>
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: GOLD }}>● Live</div>
            </div>

            <div style={{ background: '#15120D', padding: '20px', minHeight: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', borderRadius: '8px' }}>
              {callState === 'idle' && (
                <>
                  <div style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '24px', letterSpacing: '0.02em' }}>{dialNumber || 'Enter number'}</div>
                  <div style={{ color: GOLD, fontFamily: 'Arial, sans-serif', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '6px' }}>Ready</div>
                </>
              )}
              {callState === 'connecting' && <div style={{ color: GOLD, fontSize: '13px' }}>Connecting…</div>}
              {callState === 'ringing' && <div style={{ color: GOLD, fontSize: '13px' }}>Ringing…</div>}
              {callState === 'active' && <div style={{ color: '#FFFFFF', fontSize: '20px' }}>{fmt(callDuration)}</div>}
              {callState === 'incoming' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: GOLD, fontSize: '12px' }}>Incoming call</div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px' }}>{incomingFrom}</div>
                </div>
              )}
            </div>

            {callState === 'idle' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => (
                    <button key={d} onClick={() => pressDigit(d)}
                      style={{
                        padding: '16px 0', background: '#1F1B14', color: '#FFFFFF', border: 'none',
                        borderRadius: '10px', fontSize: '18px', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 2px 0 rgba(0,0,0,0.4)', transition: 'transform 0.05s',
                      }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleCall} disabled={!dialNumber}
                    style={{
                      flex: 1, padding: '15px', background: dialNumber ? GOLD : '#3A3328', color: BLACK,
                      border: 'none', borderRadius: '10px', fontFamily: 'Arial, sans-serif', fontSize: '13px',
                      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                      cursor: dialNumber ? 'pointer' : 'default',
                      boxShadow: dialNumber ? '0 2px 0 rgba(0,0,0,0.4)' : 'none',
                    }}>
                    Call
                  </button>
                  <button
                    onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                    disabled={!dialNumber}
                    aria-label="Backspace"
                    style={{
                      width: '52px', padding: '15px 0', background: '#1F1B14', color: dialNumber ? '#FFFFFF' : '#5A5448',
                      border: 'none', borderRadius: '10px', fontSize: '16px', cursor: dialNumber ? 'pointer' : 'default',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.4)',
                    }}>
                    ⌫
                  </button>
                </div>
              </>
            )}

            {callState === 'incoming' && (
              <button onClick={handleAnswer}
                style={{ width: '100%', padding: '14px', background: GOLD, color: BLACK, border: 'none', borderRadius: '10px', fontFamily: 'Arial, sans-serif', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', marginBottom: '10px', boxShadow: '0 2px 0 rgba(0,0,0,0.4)' }}>
                Answer
              </button>
            )}

            {(callState === 'active' || callState === 'ringing' || callState === 'connecting' || callState === 'incoming') && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {callState === 'active' && (
                  <button onClick={toggleMute}
                    style={{ flex: 1, padding: '12px', background: muted ? GOLD : '#1F1B14', color: muted ? BLACK : '#FFFFFF', border: 'none', borderRadius: '10px', fontFamily: 'Arial, sans-serif', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,0.4)' }}>
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                )}
                <button onClick={handleHangup}
                  style={{ flex: 1, padding: '12px', background: '#9A3F3F', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontFamily: 'Arial, sans-serif', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,0.4)' }}>
                  Hang Up
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#A8A296' }}>
          MTI Premium Charters &middot; Powered by UnifyLine
        </div>
      </main>
    </div>
  )
}
