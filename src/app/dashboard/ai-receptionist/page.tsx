'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Mic, Save, RefreshCw } from 'lucide-react'

export default function AIReceptionistPage() {
  const [config, setConfig] = useState({
    system_prompt: 'You are a professional AI receptionist. Greet callers warmly and help them reach the right person.',
    greeting_text: 'Thank you for calling. How can I help you today?',
    knowledge_base: '',
    active: true,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('ai_receptionist_config')
        .select('*')
        .eq('account_id', user.id)
        .single()
      if (data) setConfig(data)
    }
    loadConfig()
  }, [])

  async function handleSave() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('ai_receptionist_config')
      .upsert({ ...config, account_id: user.id })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setLoading(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Receptionist</h2>
          <p className="text-gray-500 mt-1">Configure your AI-powered call answering</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={config.active ? 'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700' : 'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-500'}>
            <div className={config.active ? 'w-2 h-2 rounded-full bg-green-500' : 'w-2 h-2 rounded-full bg-gray-400'} />
            {config.active ? 'Active' : 'Inactive'}
          </div>
          <button
            onClick={() => setConfig(c => ({ ...c, active: !c.active }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            {config.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mic size={20} className="text-[#0C2C68]" />
            <h3 className="font-semibold text-gray-900">AI Greeting</h3>
          </div>
          <label className="block text-sm text-gray-600 mb-2">First thing the AI says when answering</label>
          <textarea
            value={config.greeting_text}
            onChange={e => setConfig(c => ({ ...c, greeting_text: e.target.value }))}
            rows={3}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={20} className="text-[#0C2C68]" />
            <h3 className="font-semibold text-gray-900">AI Behavior</h3>
          </div>
          <label className="block text-sm text-gray-600 mb-2">System prompt</label>
          <textarea
            value={config.system_prompt}
            onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
            rows={6}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Knowledge Base</h3>
          <label className="block text-sm text-gray-600 mb-2">Business info, hours, services, FAQs</label>
          <textarea
            value={config.knowledge_base}
            onChange={e => setConfig(c => ({ ...c, knowledge_base: e.target.value }))}
            rows={8}
            placeholder="Business name: Acme Corp&#10;Hours: Monday-Friday 9am-6pm&#10;Services: ..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-[#0C2C68] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1A56C4] transition disabled:opacity-50"
        >
          <Save size={18} />
          {saved ? 'Saved!' : loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
