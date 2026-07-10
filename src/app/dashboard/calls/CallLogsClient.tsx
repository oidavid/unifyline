'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  PhoneIncoming, PhoneOutgoing, Phone, Mic, Clock, Voicemail,
  Play, Pause, Trash2, Download, FileText, Loader2
} from 'lucide-react'

type Cdr = {
  id: string
  from_number: string
  to_number: string
  direction: string
  duration_sec: number
  ai_summary: string | null
  ai_transcript: string | null
  created_at: string
}

type VoicemailMsg = {
  id: string
  filename: string
  path: string
  extension: string
  extension_name: string
  created_at: string
  size: number
}

type TimelineItem =
  | { type: 'call'; ts: number; cdr: Cdr }
  | { type: 'voicemail'; ts: number; vm: VoicemailMsg }

type FilterKey = 'all' | 'calls' | 'voicemails'

type Theme = {
  dark: boolean
  pageText: string
  pageSubtext: string
  cardBg: string
  cardBorder: string
  cardText: string
  cardSubtext: string
  accent: string
  accentText: string
  summaryBg: string
  summaryBorder: string
  summaryLabel: string
  transcriptBg: string
  transcriptBubbleAI: string
  transcriptBubbleAIText: string
  transcriptBubbleCaller: string
  transcriptBubbleCallerText: string
  transcriptBubbleCallerBorder: string
  vmBadgeBg: string
  vmBadgeText: string
  toggleBg: string
  toggleActiveBg: string
  toggleActiveText: string
  toggleInactiveText: string
}

function buildTheme(primaryColor: string): Theme {
  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)

  if (isDark) {
    // MTI dark gold theme
    return {
      dark: true,
      pageText: '#F7F5F0',
      pageSubtext: '#B8AE96',
      cardBg: '#1C1813',
      cardBorder: '#2A241A',
      cardText: '#F7F5F0',
      cardSubtext: '#B8AE96',
      accent: '#E8C26A',
      accentText: '#0A0A0A',
      summaryBg: 'rgba(232,194,106,0.08)',
      summaryBorder: 'rgba(232,194,106,0.25)',
      summaryLabel: '#E8C26A',
      transcriptBg: '#0F0C08',
      transcriptBubbleAI: '#E8C26A',
      transcriptBubbleAIText: '#0A0A0A',
      transcriptBubbleCaller: '#1C1813',
      transcriptBubbleCallerText: '#F7F5F0',
      transcriptBubbleCallerBorder: '#2A241A',
      vmBadgeBg: 'rgba(232,194,106,0.15)',
      vmBadgeText: '#E8C26A',
      toggleBg: '#1C1813',
      toggleActiveBg: '#E8C26A',
      toggleActiveText: '#0A0A0A',
      toggleInactiveText: '#B8AE96',
    }
  }

  // IntelSys / default light theme
  return {
    dark: false,
    pageText: '#111827',
    pageSubtext: '#6B7280',
    cardBg: '#FFFFFF',
    cardBorder: '#F3F4F6',
    cardText: '#111827',
    cardSubtext: '#9CA3AF',
    accent: primaryColor || '#0C2C68',
    accentText: '#FFFFFF',
    summaryBg: '#FAF5FF',
    summaryBorder: '#F3E8FF',
    summaryLabel: '#7E22CE',
    transcriptBg: '#F9FAFB',
    transcriptBubbleAI: '#0C2C68',
    transcriptBubbleAIText: '#FFFFFF',
    transcriptBubbleCaller: '#FFFFFF',
    transcriptBubbleCallerText: '#1F2937',
    transcriptBubbleCallerBorder: '#E5E7EB',
    vmBadgeBg: '#FEF3C7',
    vmBadgeText: '#B45309',
    toggleBg: '#F3F4F6',
    toggleActiveBg: primaryColor || '#0C2C68',
    toggleActiveText: '#FFFFFF',
    toggleInactiveText: '#6B7280',
  }
}

export default function CallLogsClient({ initialColor, initialCdrs }: { initialColor: string; initialCdrs: Cdr[] }) {
  const [voicemails, setVoicemails] = useState<VoicemailMsg[]>([])
  const [vmLoading, setVmLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [playing, setPlaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<Record<string, string>>({})
  const [transcribing, setTranscribing] = useState<string | null>(null)
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const T = useMemo(() => buildTheme(initialColor), [initialColor])

  useEffect(() => {
    loadVoicemails()
    return () => { try { audioRef.current?.pause() } catch {} }
  }, [])

  async function loadVoicemails() {
    setVmLoading(true)
    try {
      const res = await fetch('/api/voicemail')
      if (res.ok) setVoicemails(await res.json())
    } catch (e) { console.error('[voicemail]', e) }
    setVmLoading(false)
  }

  function playMessage(msg: VoicemailMsg) {
    if (playing === msg.id) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(`/api/voicemail-audio?path=${encodeURIComponent(msg.path)}`)
    audioRef.current = audio
    audio.onended = () => setPlaying(null)
    audio.onerror = () => { setPlaying(null); alert('Could not play voicemail.') }
    audio.play()
    setPlaying(msg.id)
  }

  async function transcribeMessage(msg: VoicemailMsg) {
    if (transcripts[msg.id]) {
      setExpandedTranscript(expandedTranscript === msg.id ? null : msg.id)
      return
    }
    setTranscribing(msg.id)
    try {
      const res = await fetch('/api/voicemail-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: msg.path }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.transcript || 'No speech detected.'
        setTranscripts((prev: Record<string, string>) => ({ ...prev, [msg.id]: text }))
        setExpandedTranscript(msg.id)
      } else {
        setTranscripts((prev: Record<string, string>) => ({ ...prev, [msg.id]: 'Transcription failed — please try again.' }))
        setExpandedTranscript(msg.id)
      }
    } catch (e) {
      setTranscripts((prev: Record<string, string>) => ({ ...prev, [msg.id]: 'Transcription error.' }))
    }
    setTranscribing(null)
  }

  async function deleteMessage(msg: VoicemailMsg) {
    if (!confirm('Delete this voicemail?')) return
    setDeleting(msg.id)
    try {
      await fetch('/api/voicemail', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: msg.path }),
      })
      setVoicemails((prev: VoicemailMsg[]) => prev.filter((m: VoicemailMsg) => m.id !== msg.id))
      setTranscripts((prev: Record<string, string>) => { const n = { ...prev }; delete n[msg.id]; return n })
    } catch (e) { alert('Failed to delete voicemail.') }
    setDeleting(null)
  }

  function downloadMessage(msg: VoicemailMsg) {
    const a = document.createElement('a')
    a.href = `/api/voicemail-audio?path=${encodeURIComponent(msg.path)}`
    a.download = `voicemail-${msg.extension}-${msg.id}.wav`
    a.click()
  }

  const formatDuration = (s: number) => {
    if (!s) return '0:00'
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const estimateVmDuration = (bytes: number) => (bytes ? Math.round(bytes / 16000) : 0)

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = []
    if (filter !== 'voicemails') {
      initialCdrs.forEach((cdr: Cdr) => items.push({ type: 'call', ts: new Date(cdr.created_at).getTime(), cdr }))
    }
    if (filter !== 'calls') {
      voicemails.forEach((vm: VoicemailMsg) => items.push({ type: 'voicemail', ts: new Date(vm.created_at).getTime(), vm }))
    }
    return items.sort((a, b) => b.ts - a.ts)
  }, [initialCdrs, voicemails, filter])

  const counts = useMemo(() => ({
    all: initialCdrs.length + voicemails.length,
    calls: initialCdrs.length,
    voicemails: voicemails.length,
  }), [initialCdrs, voicemails])

  const filterLabels: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'calls', label: `Calls (${counts.calls})` },
    { key: 'voicemails', label: `Voicemails (${counts.voicemails})` },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: T.pageText }}>Call Logs</h2>
          <p className="mt-1 text-sm" style={{ color: T.pageSubtext }}>
            Calls and voicemails in one timeline — with AI summaries and transcripts
          </p>
        </div>
        <div className="flex rounded-lg p-1 gap-1" style={{ background: T.toggleBg }}>
          {filterLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition"
              style={filter === key
                ? { background: T.toggleActiveBg, color: T.toggleActiveText }
                : { background: 'transparent', color: T.toggleInactiveText }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {vmLoading && filter !== 'calls' && (
        <div className="flex items-center gap-2 text-xs mb-3" style={{ color: T.pageSubtext }}>
          <Loader2 size={12} className="animate-spin" /> Loading voicemails…
        </div>
      )}

      {timeline.length > 0 ? (
        <div className="space-y-3">
          {timeline.map((item: TimelineItem) => {
            if (item.type === 'call') {
              const cdr = item.cdr
              let transcript: { role: string; content: string }[] = []
              try { if (cdr.ai_transcript) transcript = JSON.parse(cdr.ai_transcript) } catch {}

              return (
                <div key={`call-${cdr.id}`} className="rounded-xl shadow-sm overflow-hidden"
                  style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
                  <div className="p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${cdr.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {cdr.direction === 'inbound'
                          ? <PhoneIncoming size={16} className="text-green-600" />
                          : <PhoneOutgoing size={16} className="text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: T.cardText }}>
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
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: T.cardSubtext }}>
                          <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(cdr.duration_sec)}</span>
                          <span>{new Date(cdr.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {cdr.ai_summary && (
                      <div className="mt-3 p-3 rounded-lg"
                        style={{ background: T.summaryBg, border: `1px solid ${T.summaryBorder}` }}>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1"
                          style={{ color: T.summaryLabel }}>
                          <Mic size={11} /> AI Summary
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: T.cardText }}>{cdr.ai_summary}</p>
                      </div>
                    )}

                    {transcript.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline font-medium select-none"
                          style={{ color: T.accent }}>
                          View transcript ({transcript.length} exchanges)
                        </summary>
                        <div className="mt-2 space-y-2 max-h-56 overflow-y-auto rounded-lg p-3"
                          style={{ background: T.transcriptBg }}>
                          {transcript.map((msg: { role: string; content: string }, i: number) => (
                            <div key={i} className={`flex gap-2 ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                              <div className="max-w-xs px-3 py-2 rounded-lg text-xs leading-relaxed"
                                style={msg.role === 'assistant'
                                  ? { background: T.transcriptBubbleAI, color: T.transcriptBubbleAIText }
                                  : { background: T.transcriptBubbleCaller, color: T.transcriptBubbleCallerText, border: `1px solid ${T.transcriptBubbleCallerBorder}` }}>
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
            }

            // Voicemail row
            const vm = item.vm
            const dur = estimateVmDuration(vm.size)
            return (
              <div key={`vm-${vm.id}`} className="rounded-xl shadow-sm overflow-hidden transition"
                style={{
                  background: T.cardBg,
                  border: playing === vm.id ? `2px solid ${T.accent}` : `1px solid ${T.cardBorder}`,
                }}>
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <button onClick={() => playMessage(vm)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition"
                      style={{ background: playing === vm.id ? '#EF4444' : T.accent, color: playing === vm.id ? '#FFFFFF' : T.accentText }}>
                      {playing === vm.id ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: T.cardText }}>
                          {vm.extension_name || `Ext. ${vm.extension}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ background: T.vmBadgeBg, color: T.vmBadgeText }}>
                          <Voicemail size={10} /> voicemail
                        </span>
                        {transcripts[vm.id] && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Transcribed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: T.cardSubtext }}>
                        {dur > 0 && <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(dur)}</span>}
                        <span>{new Date(vm.created_at).toLocaleString()}</span>
                      </div>
                      {playing === vm.id && (
                        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: T.toggleBg }}>
                          <div className="h-full rounded-full animate-pulse" style={{ background: T.accent, width: '60%' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => transcribeMessage(vm)}
                        disabled={transcribing === vm.id}
                        className="flex items-center gap-1 p-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
                        style={{ color: transcripts[vm.id] ? T.accent : T.cardSubtext }}
                        title={transcripts[vm.id] ? 'View transcript' : 'Transcribe with AI'}
                      >
                        {transcribing === vm.id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <FileText size={15} />}
                        <span className="hidden sm:inline">
                          {transcribing === vm.id ? 'Transcribing…' : transcripts[vm.id] ? 'Transcript' : 'Transcribe'}
                        </span>
                      </button>
                      <button onClick={() => downloadMessage(vm)} className="p-2 rounded-lg transition"
                        style={{ color: T.cardSubtext }} title="Download">
                        <Download size={15} />
                      </button>
                      <button onClick={() => deleteMessage(vm)} disabled={deleting === vm.id}
                        className="p-2 rounded-lg transition hover:text-red-500 disabled:opacity-50"
                        style={{ color: T.cardSubtext }} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {expandedTranscript === vm.id && transcripts[vm.id] && (
                    <div className="mt-3 p-3 rounded-lg"
                      style={{ background: T.summaryBg, border: `1px solid ${T.summaryBorder}` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileText size={11} style={{ color: T.summaryLabel }} />
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.summaryLabel }}>
                          Voicemail Transcript
                        </span>
                        <button onClick={() => setExpandedTranscript(null)}
                          className="ml-auto text-xs hover:underline" style={{ color: T.cardSubtext }}>
                          Hide
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: T.cardText }}>{transcripts[vm.id]}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl shadow-sm text-center py-16"
          style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, color: T.cardSubtext }}>
          <Phone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium" style={{ color: T.cardText }}>
            {filter === 'voicemails' ? 'No voicemails yet' : 'No records yet'}
          </p>
          <p className="text-sm mt-1">
            {filter === 'voicemails'
              ? 'Voicemails left for your extensions will appear here'
              : 'Calls and voicemails will appear here as they come in'}
          </p>
        </div>
      )}
    </div>
  )
}