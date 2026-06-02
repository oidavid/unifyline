'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Phone, Plus, Trash2, Save, ArrowDown, Globe, Clock } from 'lucide-react'

interface ForwardingRule {
  id?: string
  label: string
  number: string
  delay_seconds: number
  active: boolean
  order: number
}

export default function FollowMePage() {
  const [rules, setRules] = useState<ForwardingRule[]>([
    { label: 'Mobile', number: '', delay_seconds: 0, active: true, order: 1 },
    { label: 'Office', number: '', delay_seconds: 15, active: true, order: 2 },
    { label: 'Home', number: '', delay_seconds: 30, active: false, order: 3 },
  ])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [timezone, setTimezone] = useState('America/New_York')
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('follow_me_rules').delete().eq('account_id', user.id)
    const toInsert = rules.filter(r => r.number.trim()).map(r => ({ ...r, account_id: user.id }))
    if (toInsert.length > 0) await supabase.from('follow_me_rules').insert(toInsert)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setLoading(false)
  }

  const addRule = () => setRules(r => [...r, { label: 'New Number', number: '', delay_seconds: r.length * 15, active: true, order: r.length + 1 }])
  const removeRule = (idx: number) => setRules(r => r.filter((_, i) => i !== idx))
  const updateRule = (idx: number, field: keyof ForwardingRule, value: any) =>
    setRules(r => r.map((rule, i) => i === idx ? { ...rule, [field]: value } : rule))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Follow-Me / Call Forwarding</h2>
        <p className="text-gray-500 mt-1">Route inbound calls to multiple numbers in sequence</p>
      </div>

      <div className="bg-gradient-to-r from-[#0C2C68] to-[#1A56C4] rounded-xl p-5 text-white mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} />
          <span className="font-semibold">One number. Anywhere in the world.</span>
        </div>
        <p className="text-blue-100 text-sm">When someone calls your UnifyLine number, the system tries each number below in order. If the first does not answer, it tries the next after the delay.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">Forwarding Chain</h3>
          <button onClick={addRule} className="flex items-center gap-1 text-sm text-[#0C2C68] hover:underline">
            <Plus size={14} /> Add number
          </button>
        </div>
        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rule.active ? 'bg-[#0C2C68] text-white' : 'bg-gray-200 text-gray-500'}`}>{idx + 1}</div>
                {idx < rules.length - 1 && <ArrowDown size={12} className="text-gray-300 mt-1" />}
              </div>
              <div className={`flex-1 border rounded-xl p-3 grid grid-cols-3 gap-2 ${rule.active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                <input value={rule.label} onChange={e => updateRule(idx, 'label', e.target.value)}
                  placeholder="Label" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0C2C68]" />
                <input value={rule.number} onChange={e => updateRule(idx, 'number', e.target.value)}
                  placeholder="14045551234" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0C2C68]" />
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  <select value={rule.delay_seconds} onChange={e => updateRule(idx, 'delay_seconds', Number(e.target.value))}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0C2C68]">
                    <option value={0}>Immediately</option>
                    <option value={10}>10s delay</option>
                    <option value={15}>15s delay</option>
                    <option value={20}>20s delay</option>
                    <option value={30}>30s delay</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={rule.active} onChange={e => updateRule(idx, 'active', e.target.checked)} className="rounded" />
                On
              </label>
              <button onClick={() => removeRule(idx)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Business Hours</h3>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input type="checkbox" checked={businessHoursOnly} onChange={e => setBusinessHoursOnly(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">Only forward during business hours (AI handles calls outside hours)</span>
        </label>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]">
            {['America/New_York','America/Chicago','America/Los_Angeles','Africa/Lagos','Africa/Accra','Europe/London'].map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-amber-800 mb-1">FreeSWITCH Integration</p>
        <p className="text-xs text-amber-700">After saving, follow-me rules will be applied to inbound calls automatically via the AI receptionist pipeline.</p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={loading}
          className="flex items-center gap-2 bg-[#0C2C68] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1A56C4] transition disabled:opacity-50">
          <Save size={18} />
          {saved ? '✓ Saved!' : loading ? 'Saving...' : 'Save Forwarding Rules'}
        </button>
      </div>
    </div>
  )
}
