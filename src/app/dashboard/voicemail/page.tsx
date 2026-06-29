'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Voicemail, Play, Pause, Trash2, Phone, Download } from 'lucide-react'

type VoicemailMsg = {
  id: string
  filename: string
  path: string
  extension: string
  extension_name: string
  created_at: string
  size: number
  read: boolean
}

export default function VoicemailPage() {
  const [messages, setMessages] = useState<VoicemailMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('#0C2C68')
  const [deleting, setDeleting] = useState<string | null>(null)
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
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (e) {
      console.error('[voicemail]', e)
    }
    setLoading(false)
  }

  function playMessage(msg: VoicemailMsg) {
    if (playing === msg.id) {
      // Pause
      audioRef.current?.pause()
      setPlaying(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(`/api/voicemail-audio?path=${encodeURIComponent(msg.path)}`)
    audioRef.current = audio

    audio.onended = () => setPlaying(null)
    audio.onerror = () => {
      setPlaying(null)
      alert('Could not play voicemail. The audio file may be unavailable.')
    }

    audio.play()
    setPlaying(msg.id)
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
    } catch (e) {
      alert('Failed to delete voicemail.')
    }
    setDeleting(null)
  }

  function downloadMessage(msg: VoicemailMsg) {
    const a = document.createElement('a')
    a.href = `/api/voicemail-audio?path=${encodeURIComponent(msg.path)}`
    a.download = `voicemail-${msg.extension}-${msg.id}.wav`
    a.click()
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function formatSize(bytes: number) {
    if (!bytes) return ''
    const seconds = Math.round(bytes / 16000) // Approximate for PCM WAV
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(accentColor)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Voicemail</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {loading ? 'Loading...' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={loadVoicemails}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition"
          style={{ background: accentColor }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="animate-pulse">
            <Voicemail size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Loading voicemails...</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Voicemail size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No voicemails</p>
          <p className="text-sm text-gray-400 mt-1">Voicemails left for your extensions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: VoicemailMsg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-xl border shadow-sm p-4 transition ${
                playing === msg.id ? 'border-2' : 'border-gray-100'
              }`}
              style={playing === msg.id ? { borderColor: accentColor } : {}}
            >
              <div className="flex items-center gap-4">
                {/* Play button */}
                <button
                  onClick={() => playMessage(msg)}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition text-white"
                  style={{ background: playing === msg.id ? '#EF4444' : accentColor }}
                >
                  {playing === msg.id
                    ? <Pause size={18} />
                    : <Play size={18} className="ml-0.5" />
                  }
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">
                      {msg.extension_name || `Ext. ${msg.extension}`}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
                      style={{ background: accentColor }}
                    >
                      Ext. {msg.extension}
                    </span>
                    {msg.size && (
                      <span className="text-xs text-gray-400">{formatSize(msg.size)}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(msg.created_at)}</p>

                  {/* Audio progress indicator */}
                  {playing === msg.id && (
                    <div className="mt-2 h-1 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full rounded-full animate-pulse"
                        style={{ background: accentColor, width: '60%' }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => downloadMessage(msg)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                    title="Download"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => deleteMessage(msg)}
                    disabled={deleting === msg.id}
                    className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        Voicemails are stored securely on your UnifyLine server
      </p>
    </div>
  )
}
