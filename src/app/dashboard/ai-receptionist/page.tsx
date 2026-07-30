'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Mic, Save, RefreshCw, PhoneForwarded } from 'lucide-react'

type Config = { system_prompt: string; greeting_text: string; knowledge_base: string; active: boolean }
type DidOption = { did_number: string; label: string; mode: string }

export default function AIReceptionistPage() {
  const [config, setConfig] = useState<Config>({ system_prompt: '', greeting_text: '', knowledge_base: '', active: true })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [accountId, setAccountId] = useState('')
  const [dids, setDids] = useState<DidOption[]>([])
  const [selectedDid, setSelectedDid] = useState('') // '' = account-level default
  const supabase = createClient()

  useEffect(() => { initAccount() }, [])
  useEffect(() => { if (accountId) loadConfig() }, [accountId, selectedDid])

  async function initAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
      const accId = auData?.account_id || user.id
      setAccountId(accId)
    } catch (e) { console.error('[initAccount]', e) }
  }

  async function loadConfig() {
    try {
      const url = selectedDid
        ? `/api/receptionist-config?account_id=${accountId}&did_number=${selectedDid}`
        : `/api/receptionist-config?account_id=${accountId}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setDids(data.dids || [])
        if (data.config) {
          setConfig({
            system_prompt: data.config.system_prompt || '',
            greeting_text: data.config.greeting_text || '',
            knowledge_base: data.config.knowledge_base || '',
            active: data.config.active ?? true,
          })
        } else {
          setConfig({ system_prompt: '', greeting_text: '', knowledge_base: '', active: true })
        }
      }
    } catch (e) { console.error('[loadConfig]', e) }
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/receptionist-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          did_number: selectedDid || undefined,
          ...config,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { setError('Failed to save. Please try again.') }
    setLoading(false)
  }

  function fmtDid(d: string) {
    const digits = d.replace(/\D/g, '')
    if (digits.length !== 10) return d
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">AI Receptionist</h2>
          <p className="text-gray-500 mt-1 text-sm">Configure your AI-powered call answering</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            {config.active ? 'Active' : 'Inactive'}
          </div>
          <button onClick={() => setConfig((prev: Config) => ({ ...prev, active: !prev.active }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
            {config.active ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>

      {dids.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
          <PhoneForwarded size={16} className="text-gray-400 flex-shrink-0" />
          <label className="text-sm font-medium text-gray-700 flex-shrink-0">Editing:</label>
          <select
            value={selectedDid}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDid(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Default (account-wide)</option>
            {dids.map(d => (
              <option key={d.did_number} value={d.did_number}>
                {d.label} — {fmtDid(d.did_number)} ({d.mode})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3"><Mic size={18} style={{ color: 'var(--brand, #5B4A9B)' }} /><h3 className="font-semibold text-gray-900">AI Greeting</h3></div>
          <label className="block text-sm text-gray-500 mb-2">First thing the AI says when answering</label>
          <textarea value={config.greeting_text} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig((c: Config) => ({ ...c, greeting_text: e.target.value }))} rows={4} placeholder="Thank you for calling. How can I help you today?" className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none placeholder-gray-300 resize-none" />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3"><RefreshCw size={18} style={{ color: 'var(--brand, #5B4A9B)' }} /><h3 className="font-semibold text-gray-900">AI Behavior</h3></div>
          <label className="block text-sm text-gray-500 mb-2">System prompt - how the AI should act</label>
          <textarea value={config.system_prompt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig((c: Config) => ({ ...c, system_prompt: e.target.value }))} rows={6} className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none placeholder-gray-300 resize-none" />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-3">Knowledge Base</h3>
          <label className="block text-sm text-gray-500 mb-2">Business info, hours, services, FAQs - the AI uses this to answer callers</label>
          <textarea value={config.knowledge_base} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig((c: Config) => ({ ...c, knowledge_base: e.target.value }))} rows={6} placeholder="Business name: Acme Corp Hours: Monday-Friday 9am-6pm Services: ..." className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none placeholder-gray-300 resize-none" />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-500 text-right">{error}</p>}
      <div className="mt-5 flex justify-end">
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50" style={{ background: 'var(--brand, #5B4A9B)' }}>
          <Save size={16} />{saved ? 'Saved!' : loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}