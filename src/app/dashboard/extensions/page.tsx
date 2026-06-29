'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Phone, Plus, Trash2, Save, CheckCircle, XCircle, X, Pencil } from 'lucide-react'

interface Extension {
  id?: string
  name: string
  extension: string
  extension_number?: string
  display_name?: string
  email: string
  mobile: string
  ring_group: string
  active: boolean
  role: string
}

const GROUPS = ['Sales', 'Support', 'Management', 'All Staff']

export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accentColor, setAccentColor] = useState('#0C2C68')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Extension>>({})
  const [newExt, setNewExt] = useState<Extension>({
    name: '', extension: '', email: '', mobile: '',
    ring_group: 'All Staff', active: true, role: 'agent'
  })
  const supabase = createClient()

  useEffect(() => {
    const w = window as any
    const color = w.__BRAND?.color || getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
    if (color) setAccentColor(color)
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
    const accountId = auData?.account_id || user.id
    const { data } = await supabase.from('extensions').select('*').eq('account_id', accountId).order('extension_number')
    setExtensions(data || [])
  }

  async function handleAdd() {
    if (!newExt.name || !newExt.extension) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
    const accountId = auData?.account_id || user.id
    await supabase.from('extensions').insert({
      display_name: newExt.name,
      extension_number: newExt.extension,
      email: newExt.email,
      mobile: newExt.mobile,
      ring_group: newExt.ring_group,
      active: true,
      role: newExt.role,
      account_id: accountId,
    })
    setNewExt({ name: '', extension: '', email: '', mobile: '', ring_group: 'All Staff', active: true, role: 'agent' })
    setShowAdd(false)
    setSaving(false)
    load()
  }

  function startEdit(ext: Extension) {
    setEditingId(ext.id || null)
    setEditValues({
      display_name: ext.display_name || ext.name || '',
      email: ext.email || '',
      mobile: ext.mobile || '',
      ring_group: ext.ring_group || 'All Staff',
      role: ext.role || 'agent',
    })
  }

  async function saveEdit(ext: Extension) {
    if (!ext.id) return
    setSaving(true)
    await supabase.from('extensions').update({
      display_name: editValues.display_name,
      email: editValues.email,
      mobile: editValues.mobile,
      ring_group: editValues.ring_group,
      role: editValues.role,
    }).eq('id', ext.id)
    setEditingId(null)
    setEditValues({})
    setSaving(false)
    load()
  }

  async function toggleActive(ext: Extension) {
    await supabase.from('extensions').update({ active: !ext.active }).eq('id', ext.id)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this extension?')) return
    await supabase.from('extensions').delete().eq('id', id)
    load()
  }

  const nextExt = () => {
    if (!extensions.length) return '201'
    const nums = extensions.map((e: Extension) => parseInt(e.extension_number || e.extension || '0')).filter((n: number) => !isNaN(n))
    return String(Math.max(...nums) + 1)
  }

  const extName = (e: Extension) => e.display_name || e.name || ''
  const extNum = (e: Extension) => e.extension_number || e.extension || ''

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Extensions</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage team extensions and ring groups</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setNewExt((e: any) => ({ ...e, extension: nextExt() })) }}
          className="flex items-center gap-2 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-sm font-semibold transition"
          style={{ background: accentColor }}
        >
          <Plus size={16} /><span className="hidden sm:inline">Add </span>Extension
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-xl p-4 md:p-5 text-white mb-5" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)` }}>
        <h3 className="font-semibold mb-2 text-sm md:text-base">How Extensions Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm opacity-90">
          <div><span className="font-medium text-white block">Internal calls</span>Dial an extension from your softphone to reach teammates directly.</div>
          <div><span className="font-medium text-white block">AI routing</span>AI qualifies callers and routes to the right ring group automatically.</div>
          <div><span className="font-medium text-white block">Mobile app</span>Each extension rings on the team member's UnifyLine app.</div>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Extension</h3>
            <button onClick={() => setShowAdd(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Full Name *', field: 'name', ph: 'John Smith' },
              { label: 'Extension *', field: 'extension', ph: '201' },
              { label: 'Email', field: 'email', ph: 'john@company.com' },
              { label: 'Mobile', field: 'mobile', ph: '14045551234' },
            ].map(({ label, field, ph }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={newExt[field as keyof Extension] as string}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExt((n: any) => ({ ...n, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none placeholder-gray-400"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = accentColor}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ring Group</label>
              <select value={newExt.ring_group} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewExt((n: any) => ({ ...n, ring_group: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select value={newExt.role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewExt((n: any) => ({ ...n, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: accentColor }}>
              <Save size={14} />{saving ? 'Saving...' : 'Create Extension'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Extensions list */}
      {extensions.length > 0 ? (
        <div className="space-y-3">
          {extensions.map((ext: any) => (
            <div key={ext.id} className={`bg-white rounded-xl border shadow-sm ${!ext.active ? 'opacity-60' : ''} ${editingId === ext.id ? 'border-2' : 'border-gray-100'}`}
              style={editingId === ext.id ? { borderColor: accentColor } : {}}>

              {editingId === ext.id ? (
                /* EDIT MODE */
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">Editing Ext. {extNum(ext)}</span>
                    </div>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input
                        value={editValues.display_name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValues((v: any) => ({ ...v, display_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = accentColor}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = '#E5E7EB'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <input
                        value={editValues.email || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValues((v: any) => ({ ...v, email: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = accentColor}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = '#E5E7EB'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
                      <input
                        value={editValues.mobile || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValues((v: any) => ({ ...v, mobile: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = accentColor}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.style.borderColor = '#E5E7EB'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ring Group</label>
                      <select
                        value={editValues.ring_group || 'All Staff'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditValues((v: any) => ({ ...v, ring_group: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        {GROUPS.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(ext)}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                      style={{ background: accentColor }}>
                      <Save size={13} />{saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW MODE */
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                    style={{ background: ext.active ? accentColor : '#D1D5DB' }}>
                    {extName(ext).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{extName(ext)}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
                        style={{ background: accentColor }}>
                        Ext. {extNum(ext)}
                      </span>
                      {ext.ring_group && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hidden sm:inline">{ext.ring_group}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                      {ext.email && <span className="truncate max-w-[160px]">{ext.email}</span>}
                      {ext.mobile && <span className="font-mono">{ext.mobile}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startEdit(ext)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
                      title="Edit extension">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleActive(ext)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${ext.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {ext.active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      <span className="hidden sm:inline">{ext.active ? 'Active' : 'Off'}</span>
                    </button>
                    <button onClick={() => del(ext.id!)} className="text-gray-300 hover:text-red-500 p-1.5"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-14">
          <Phone size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No extensions yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first team member to get started</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 inline-flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: accentColor }}>
            <Plus size={14} />Add Extension
          </button>
        </div>
      )}
    </div>
  )
}
