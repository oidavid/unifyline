'use client'
import React, { useState, useEffect } from 'react'
import { PhoneForwarded, Plus, Trash2, Pencil, X, Save, Loader2 } from 'lucide-react'

type OnCallRow = {
  id: string
  phone_number: string
  label: string | null
  department: string | null
  priority: number
  active: boolean
}

type Theme = {
  dark: boolean
  pageText: string
  pageSubtext: string
  cardBg: string
  cardBorder: string
  accent: string
  accentText: string
  inputBg: string
  inputBorder: string
  deptBadgeBg: string
  deptBadgeText: string
  generalBadgeBg: string
  generalBadgeText: string
}

function buildTheme(primaryColor: string): Theme {
  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)
  if (isDark) {
    return {
      dark: true,
      pageText: '#F7F5F0',
      pageSubtext: '#B8AE96',
      cardBg: '#1C1813',
      cardBorder: '#2A241A',
      accent: '#E8C26A',
      accentText: '#0A0A0A',
      inputBg: '#0F0C08',
      inputBorder: '#2A241A',
      deptBadgeBg: 'rgba(232,194,106,0.15)',
      deptBadgeText: '#E8C26A',
      generalBadgeBg: 'rgba(255,255,255,0.08)',
      generalBadgeText: '#B8AE96',
    }
  }
  return {
    dark: false,
    pageText: '#111827',
    pageSubtext: '#6B7280',
    cardBg: '#FFFFFF',
    cardBorder: '#F3F4F6',
    accent: primaryColor || '#0C2C68',
    accentText: '#FFFFFF',
    inputBg: '#FFFFFF',
    inputBorder: '#E5E7EB',
    deptBadgeBg: '#EFF6FF',
    deptBadgeText: primaryColor || '#0C2C68',
    generalBadgeBg: '#F3F4F6',
    generalBadgeText: '#6B7280',
  }
}

const DEPARTMENTS = [
  { value: 'general', label: 'General (any/all)' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'fleet_repair', label: 'Fleet Repair' },
  { value: 'billing', label: 'Billing' },
  { value: 'parking', label: 'Parking' },
]

const emptyForm = { id: '', phone_number: '', label: '', department: 'general', priority: 1, active: true }

export default function OnCallClient({ initialColor }: { initialColor: string }) {
  const [rows, setRows] = useState<OnCallRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const T = buildTheme(initialColor)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/on-call')
      if (res.ok) setRows(await res.json())
    } catch (e) { console.error('[on-call load]', e) }
    setLoading(false)
  }

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(row: OnCallRow) {
    setForm({
      id: row.id,
      phone_number: row.phone_number,
      label: row.label || '',
      department: row.department || 'general',
      priority: row.priority,
      active: row.active,
    })
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/on-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Save failed')
      }
      setShowForm(false)
      await load()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this on-call number?')) return
    try {
      await fetch('/api/on-call', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await load()
    } catch (e) { alert('Failed to delete.') }
  }

  function deptLabel(dept: string | null) {
    if (!dept) return 'General'
    const found = DEPARTMENTS.find(d => d.value === dept)
    return found ? found.label.replace(' (any/all)', '') : dept
  }

  function fmtPhone(num: string) {
    const digits = num.replace(/\D/g, '').replace(/^1/, '')
    if (digits.length !== 10) return num
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: T.pageText }}>
            <PhoneForwarded size={22} style={{ color: T.accent }} />
            On-Call Routing
          </h2>
          <p className="mt-1 text-sm" style={{ color: T.pageSubtext }}>
            Numbers Aria can live-transfer urgent calls to, by department
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: T.accent, color: T.accentText }}
        >
          <Plus size={16} /> Add Number
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-5 mb-6 shadow-sm" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: T.pageText }}>
              {form.id ? 'Edit On-Call Number' : 'Add On-Call Number'}
            </h3>
            <button onClick={() => setShowForm(false)} style={{ color: T.pageSubtext }}>
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs uppercase tracking-wide" style={{ color: T.pageSubtext }}>Phone Number</label>
              <input
                type="text"
                placeholder="678-923-5637"
                value={form.phone_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.pageText }}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide" style={{ color: T.pageSubtext }}>Label (optional)</label>
              <input
                type="text"
                placeholder="e.g. Mike's Cell"
                value={form.label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.pageText }}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide" style={{ color: T.pageSubtext }}>Department</label>
              <select
                value={form.department}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.pageText }}
              >
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide" style={{ color: T.pageSubtext }}>Priority (1 = tried first)</label>
              <input
                type="number"
                min={1}
                value={form.priority}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.pageText }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mb-4 text-sm" style={{ color: T.pageText }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active
          </label>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: T.pageSubtext }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: T.accent, color: T.accentText }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12" style={{ color: T.pageSubtext }}>
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl text-center py-16" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, color: T.pageSubtext }}>
          <PhoneForwarded size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium" style={{ color: T.pageText }}>No on-call numbers configured</p>
          <p className="text-sm mt-1">Add a number so Aria can live-transfer urgent calls</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl p-4 flex items-center gap-4 shadow-sm"
              style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, opacity: row.active ? 1 : 0.5 }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: T.pageText }}>{fmtPhone(row.phone_number)}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={row.department
                      ? { background: T.deptBadgeBg, color: T.deptBadgeText }
                      : { background: T.generalBadgeBg, color: T.generalBadgeText }}
                  >
                    {deptLabel(row.department)}
                  </span>
                  {!row.active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">Inactive</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: T.pageSubtext }}>
                  {row.label || 'No label'} · Priority {row.priority}
                </p>
              </div>
              <button onClick={() => openEdit(row)} className="p-2 rounded-lg" style={{ color: T.pageSubtext }}>
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(row.id)} className="p-2 rounded-lg hover:text-red-500" style={{ color: T.pageSubtext }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center mt-6" style={{ color: T.pageSubtext }}>
        When Aria detects a caller needs a specific department, she tries department-matched numbers first (by priority), then falls back to General numbers.
      </p>
    </div>
  )
}