'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Voicemail, Play, Pause, Trash2, Download, ArrowUpDown, Filter, FileText, Loader2 } from 'lucide-react'

type VoicemailMsg = {
  id: string
  filename: string
  path: string
  extension: string
  extension_name: string
  created_at: string
  size: number
}

type SortKey = 'newest' | 'oldest' | 'longest' | 'shortest'

export default function VoicemailPage() {
  const [messages, setMessages] = useState<VoicemailMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('#0C2C68')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [filterExt, setFilterExt] = useState<string>('all')
  const [transcripts, setTranscripts] = useState<Record<string, string>>({})
  const [transcribing, setTranscribing] = useState<string | null>(null)
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const w = window as any
    const color = w.__BRAND?.color || getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
    if (color) setAccentColor(color)
    loadVoicemails()
  }, [])

  async function loadVoicemails() {
    setLoading(true)
    try {
      const res = await fetch('/api/voicemail')
      if (res.ok) setMessages(await res.json())
    } catch (e) { console.error('[voicemail]', e) }
    setLoading(false)
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
        setTranscripts((prev: Record<string,string>) => ({ ...prev, [msg.id]: text }))
        setExpandedTranscript(msg.id)
      } else {
        setTranscripts((prev: Record<string,string>) => ({ ...prev, [msg.id]: 'Transcription failed — please try again.' }))
        setExpandedTranscript(msg.id)
      }
    } catch (e) {
      setTranscripts((prev: Record<string,string>) => ({ ...prev, [msg.id]: 'Transcription error.' }))
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
      setMessages((prev: VoicemailMsg[]) => prev.filter((m: VoicemailMsg) => m.id !== msg.id))
      setTranscripts((prev: Record<string,string>) => { const n = { ...prev }; delete n[msg.id]; return n })
    } catch (e) { alert('Failed to delete voicemail.') }
    setDeleting(null)
  }

  function downloadMessage(msg: VoicemailMsg) {
    const a = document.createElement('a')
    a.href = `/api/voicemail-audio?path=${encodeURIComponent(msg.path)}`
    a.download = `voicemail-${msg.extension}-${msg.id}.wav`
    a.click()
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function estimateDuration(bytes: number) {
    return bytes ? Math.round(bytes / 16000) : 0
  }

  function formatDuration(seconds: number) {
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const extensionOptions = useMemo(() => {
    const map = new Map<string, string>()
    messages.forEach((m: VoicemailMsg) => map.set(m.extension, m.extension_name || `Ext ${m.extension}`))
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [messages])

  const filteredAndSorted = useMemo(() => {
    let list = filterExt === 'all' ? messages : messages.filter((m: VoicemailMsg) => m.extension === filterExt)
    return [...list].sort((a: VoicemailMsg, b: VoicemailMsg) => {
      switch (sortKey) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'longest': return estimateDuration(b.size) - estimateDuration(a.size)
        case 'shortest': return estimateDuration(a.size) - estimateDuration(b.size)
        default: return 0
      }
    })
  }, [messages, sortKey, filterExt])

  const sortLabels: Record<SortKey, string> = {
    newest: 'Newest first', oldest: 'Oldest first',
    longest: 'Longest first', shortest: 'Shortest first',
  }

  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(accentColor)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Voicemail</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {loading ? 'Loading...' : `${filteredAndSorted.length} of ${messages.length} message${messages.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={loadVoicemails} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: accentColor }}>
          Refresh
        </button>
      </div>

      {messages.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <select value={sortKey} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortKey(e.target.value as SortKey)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none">
              {Object.entries(sortLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select value={filterExt} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterExt(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none">
              <option value="all">All extensions</option>
              {extensionOptions.map(([num, name]: [string, string]) => (
                <option key={num} value={num}>{name} (Ext. {num})</option>
              ))}
            </select>
          </div>
          {filterExt !== 'all' && (
            <button onClick={() => setFilterExt('all')} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear filter</button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="animate-pulse">
            <Voicemail size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Loading voicemails...</p>
          </div>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Voicemail size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">{messages.length === 0 ? 'No voicemails' : 'No voicemails match this filter'}</p>
          <p className="text-sm text-gray-400 mt-1">{messages.length === 0 ? 'Voicemails left for your extensions will appear here' : 'Try a different extension or clear the filter'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((msg: VoicemailMsg) => (
            <div key={msg.id} className={`bg-white rounded-xl border shadow-sm transition ${playing === msg.id ? 'border-2' : 'border-gray-100'}`}
              style={playing === msg.id ? { borderColor: accentColor } : {}}>
              <div className="flex items-center gap-4 p-4">
                {/* Play button */}
                <button onClick={() => playMessage(msg)}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white transition"
                  style={{ background: playing === msg.id ? '#EF4444' : accentColor }}>
                  {playing === msg.id ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{msg.extension_name || `Ext. ${msg.extension}`}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white" style={{ background: accentColor }}>
                      Ext. {msg.extension}
                    </span>
                    {msg.size > 0 && <span className="text-xs text-gray-400">{formatDuration(estimateDuration(msg.size))}</span>}
                    {transcripts[msg.id] && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Transcribed</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(msg.created_at)}</p>
                  {playing === msg.id && (
                    <div className="mt-2 h-1 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full rounded-full animate-pulse" style={{ background: accentColor, width: '60%' }} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => transcribeMessage(msg)}
                    disabled={transcribing === msg.id}
                    className="flex items-center gap-1 p-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    style={{ color: transcripts[msg.id] ? accentColor : '#9CA3AF' }}
                    title={transcripts[msg.id] ? 'View transcript' : 'Transcribe with AI'}
                  >
                    {transcribing === msg.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <FileText size={15} />
                    }
                    <span className="hidden sm:inline">
                      {transcribing === msg.id ? 'Transcribing...' : transcripts[msg.id] ? 'Transcript' : 'Transcribe'}
                    </span>
                  </button>
                  <button onClick={() => downloadMessage(msg)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50" title="Download">
                    <Download size={15} />
                  </button>
                  <button onClick={() => deleteMessage(msg)} disabled={deleting === msg.id}
                    className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Transcript panel */}
              {expandedTranscript === msg.id && transcripts[msg.id] && (
                <div className="px-4 pb-4">
                  <div className="rounded-lg p-3 border" style={{ background: isDark ? 'rgba(232,194,106,0.06)' : '#F9FAFB', borderColor: isDark ? 'rgba(232,194,106,0.2)' : '#E5E7EB' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={12} style={{ color: accentColor }} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI Transcript</span>
                      <button onClick={() => setExpandedTranscript(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Hide</button>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{transcripts[msg.id]}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        Voicemails are stored securely on your UnifyLine server · AI transcription powered by Deepgram
      </p>
    </div>
  )
}
