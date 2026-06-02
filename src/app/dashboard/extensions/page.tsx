'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Phone, Plus, Trash2, Save, CheckCircle, XCircle, X } from 'lucide-react'

interface Extension {
  id?: string
  name: string
  extension: string
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
  const [newExt, setNewExt] = useState<Extension>({ name:'', extension:'', email:'', mobile:'', ring_group:'All Staff', active:true, role:'agent' })
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('extensions').select('*').eq('account_id', user.id).order('extension')
    setExtensions(data || [])
  }

  async function handleAdd() {
    if (!newExt.name || !newExt.extension) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('extensions').insert({ ...newExt, account_id: user.id })
    setNewExt({ name:'', extension:'', email:'', mobile:'', ring_group:'All Staff', active:true, role:'agent' })
    setShowAdd(false)
    setSaving(false)
    load()
  }

  async function toggleActive(ext: Extension) {
    await supabase.from('extensions').update({ active: !ext.active }).eq('id', ext.id)
    load()
  }

  async function del(id: string) {
    await supabase.from('extensions').delete().eq('id', id)
    load()
  }

  const nextExt = () => {
    if (!extensions.length) return '101'
    const nums = extensions.map(e => parseInt(e.extension)).filter(n => !isNaN(n))
    return String(Math.max(...nums) + 1)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">Extensions</h2><p className="text-gray-500 mt-1">Manage team extensions and ring groups</p></div>
        <button onClick={() => { setShowAdd(true); setNewExt(e => ({...e, extension: nextExt()})) }} className="flex items-center gap-2 bg-[#0C2C68] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1A56C4] transition">
          <Plus size={16}/>Add Extension
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#0C2C68] to-[#1A56C4] rounded-xl p-5 text-white mb-6">
        <h3 className="font-semibold mb-2">How Extensions Work</h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-blue-100">
          <div><span className="font-medium text-white block">Internal calls</span>Dial ext. 101 from softphone to reach Sales directly. Free, instant.</div>
          <div><span className="font-medium text-white block">AI routing</span>AI qualifies caller and routes hot leads to the right ring group automatically.</div>
          <div><span className="font-medium text-white block">Mobile app</span>Each extension rings on the team member's mobile phone via UnifyLine app.</div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">New Extension</h3>
            <button onClick={() => setShowAdd(false)}><X size={18} className="text-gray-400"/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[{label:'Full Name *',field:'name',ph:'John Smith'},{label:'Extension *',field:'extension',ph:'101'},{label:'Email',field:'email',ph:'john@company.com'},{label:'Mobile',field:'mobile',ph:'14045551234'}].map(({label,field,ph})=>(
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input value={newExt[field as keyof Extension] as string} onChange={e => setNewExt(n=>({...n,[field]:e.target.value}))} placeholder={ph}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ring Group</label>
              <select value={newExt.ring_group} onChange={e => setNewExt(n=>({...n,ring_group:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]">
                {GROUPS.map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select value={newExt.role} onChange={e => setNewExt(n=>({...n,role:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]">
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-2 bg-[#0C2C68] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1A56C4] disabled:opacity-50">
              <Save size={14}/>{saving?'Saving...':'Create Extension'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {extensions.length > 0 ? (
        <div className="space-y-3">
          {extensions.map(ext => (
            <div key={ext.id} className={`bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4 ${!ext.active?'opacity-60':''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${ext.active?'bg-[#0C2C68] text-white':'bg-gray-200 text-gray-500'}`}>
                {ext.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{ext.name}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-bold">Ext. {ext.extension}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{ext.ring_group}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ext.role==='admin'?'bg-purple-100 text-purple-700':ext.role==='manager'?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-600'}`}>{ext.role}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {ext.email&&<span>{ext.email}</span>}
                  {ext.mobile&&<span className="font-mono">{ext.mobile}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(ext)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${ext.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                  {ext.active?<CheckCircle size={12}/>:<XCircle size={12}/>}{ext.active?'Active':'Disabled'}
                </button>
                <button onClick={() => del(ext.id!)} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
          <Phone size={40} className="mx-auto mb-3 text-gray-300"/>
          <p className="font-medium text-gray-600">No extensions yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first team member to get started</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-2 bg-[#0C2C68] text-white px-4 py-2 rounded-lg text-sm font-semibold">
            <Plus size={14}/>Add Extension
          </button>
        </div>
      )}

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h4 className="font-semibold text-amber-800 mb-2">Supabase Setup Required</h4>
        <pre className="bg-amber-100 rounded-lg p-3 text-xs font-mono text-amber-900">{`ALTER TABLE extensions ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE extensions ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE extensions ADD COLUMN IF NOT EXISTS ring_group text DEFAULT 'All Staff';
ALTER TABLE extensions ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent';
ALTER TABLE extensions ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;`}</pre>
      </div>
    </div>
  )
}
