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
      // Try account_users first for multi-tenant, fall back to user.id
      const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
      const accountId = auData?.account_id || user.id
      const { data } = await supabase.from('ai_receptionist_config').select('*').eq('account_id', accountId).single()
      if (data) setConfig(data)
    }
    loadConfig()
  }, [])

  async function handleSave() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
    const accountId = auData?.account_id || user.id
    await supabase.from('ai_receptionist_config').upsert({ ...config, account_id: accountId })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">AI Receptionist</h2>
          <p className="text-gray-500 mt-1 text-sm">Configure your AI-powered call answering</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            {config.active ? 'Active' : 'Inactive'}
          </div>
          <button onClick={() => setConfig(c => ({ ...c, active: !c.active }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
            {config.active ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Mic size={18} className="text-[#5B4A9B]" />
            <h3 className="font-semibold text-gray-900">AI Greeting</h3>
          </div>
          <label className="block text-sm text-gray-500 mb-2">First thing the AI says when answering</label>
          <textarea
            value={config.greeting_text}
            onChange={e => setConfig(c => ({ ...c, greeting_text: e.target.value }))}
            rows={4}
            placeholder="Thank you for calling. How can I help you today?"
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4A9B] placeholder-gray-300 resize-none"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={18} className="text-[#5B4A9B]" />
            <h3 className="font-semibold text-gray-900">AI Behavior</h3>
          </div>
          <label className="block text-sm text-gray-500 mb-2">System prompt — how the AI should act</label>
          <textarea
            value={config.system_prompt}
            onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
            rows={6}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4A9B] placeholder-gray-300 resize-none"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-3">Knowledge Base</h3>
          <label className="block text-sm text-gray-500 mb-2">Business info, hours, services, FAQs — the AI uses this to answer callers</label>
          <textarea
            value={config.knowledge_base}
            onChange={e => setConfig(c => ({ ...c, knowledge_base: e.target.value }))}
            rows={8}
            placeholder="Business name: Acme Corp&#10;Hours: Monday-Friday 9am-6pm&#10;Services: ..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4A9B] placeholder-gray-300 resize-none"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={handleSave} disabled={loading}
          className="flex items-center gap-2 bg-[#5B4A9B] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#7B6BBF] transition disabled:opacity-50">
          <Save size={16} />
          {saved ? '✓ Saved!' : loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
