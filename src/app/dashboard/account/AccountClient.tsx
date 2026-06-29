'use client'
import React, { useState } from 'react'
import { Phone, Mic, Target, Hash, CheckCircle, Bell, Save } from 'lucide-react'

type AccountData = {
  accountId: string
  accountName: string
  planName: string
  primaryColor: string
  alertEmail: string
  alertPhone: string
  usage: { totalCalls: number; aiHandled: number; leadsCaptured: number; activeDids: number }
}

export default function AccountClient({ data }: { data: AccountData }) {
  const [alertEmail, setAlertEmail] = useState(data.alertEmail)
  const [alertPhone, setAlertPhone] = useState(data.alertPhone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(data.primaryColor)
  const cardGradient = isDark
    ? 'linear-gradient(135deg, #E8C26A 0%, #C9A23F 50%, #A67C20 100%)'
    : `linear-gradient(135deg, ${data.primaryColor}, ${data.primaryColor}BB)`
  const cardTextColor = isDark ? '#0A0A0A' : '#FFFFFF'
  const cardSubTextColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'
  const accentColor = isDark ? '#C9A23F' : data.primaryColor

  const stats = [
    { label: 'Total Calls', value: data.usage.totalCalls, icon: Phone, tip: 'All inbound calls' },
    { label: 'AI Handled', value: data.usage.aiHandled, icon: Mic, tip: 'Calls Aria answered' },
    { label: 'Leads Captured', value: data.usage.leadsCaptured, icon: Target, tip: 'Calls with AI summary' },
    { label: 'Active DIDs', value: data.usage.activeDids, icon: Hash, tip: 'Phone lines' },
  ]

  const features = [
    'AI Receptionist - always on, always answering',
    'Call summaries and transcripts',
    'Browser softphone (WebRTC)',
    'Team extensions',
    'Conference bridge',
    'Call logs and history',
    'Morning briefing emails',
    'Hot lead SMS and email alerts',
  ]

  async function handleSaveAlerts() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/account-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: data.accountId, alert_email: alertEmail, alert_phone: alertPhone }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Account</h2>
        <p className="text-gray-500 mt-1 text-sm">{data.accountName} - plan and usage overview</p>
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ background: cardGradient }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: cardSubTextColor }}>Current Plan</p>
            <p className="text-2xl font-bold" style={{ color: cardTextColor }}>{data.planName}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold" style={{ color: cardTextColor }}>Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, tip }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} className="text-gray-400" />
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{tip}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={18} style={{ color: accentColor }} />
          <h3 className="font-semibold text-gray-900">Hot Lead Alert Settings</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">When Aria captures a lead, we notify you instantly by email and SMS.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alert Email</label>
            <input
              type="email"
              value={alertEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple emails with commas</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alert Phone (SMS)</label>
            <input
              type="tel"
              value={alertPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlertPhone(e.target.value)}
              placeholder="4045551234"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">10-digit US number, no dashes</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <button onClick={handleSaveAlerts} disabled={saving}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: accentColor }}>
          <Save size={14} />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Alert Settings'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">What's included</h3>
        <div className="space-y-3">
          {features.map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle size={16} style={{ color: accentColor }} className="flex-shrink-0" />
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Need to make changes to your plan? Contact us at{' '}
            <a href="mailto:support@unifyline.com" style={{ color: accentColor }} className="underline">support@unifyline.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}