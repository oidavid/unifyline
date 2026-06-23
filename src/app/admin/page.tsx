'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const SUPER_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'UL-Admin-2026!'

type Role = 'super_admin' | 'manager' | 'support' | 'viewer'
type AuthState = { type: 'none' } | { type: 'super_admin' }
type Tab = 'accounts' | 'extensions' | 'users' | 'calls' | 'system'

type Account = {
  id: string
  name: string
  slug: string
  status: string
  sip_domain: string
  brand_primary_color: string
  created_at: string
}

type Extension = {
  id: string
  account_id: string
  extension_number: string
  display_name: string
  sip_password: string
  active: boolean
  email: string
  role: string
  created_at: string
  account_name?: string
}

type User = {
  id: string
  email: string
  full_name: string
  account_name?: string
  role?: string
  created_at: string
}

type CallRecord = {
  id: string
  from_number: string
  to_number: string
  duration_sec: number
  direction: string
  ai_summary: string
  created_at: string
  account_id: string
  account_name?: string
}

type Stats = {
  totalAccounts: number
  activeAccounts: number
  totalExtensions: number
  totalCalls: number
  totalUsers: number
  trialAccounts: number
}

function canDo(auth: AuthState, action: string): boolean {
  return auth.type === 'super_admin'
}

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthState>({ type: 'none' })
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState<Tab>('accounts')
  const [loading, setLoading] = useState(false)
  const [dark, setDark] = useState(true)

  const [stats, setStats] = useState<Stats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [calls, setCalls] = useState<CallRecord[]>([])

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [modalType, setModalType] = useState<'account_detail' | 'new_account' | 'new_extension' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const [newAccount, setNewAccount] = useState({ name: '', slug: '', sip_domain: '', brand_primary_color: '#0C2C68', status: 'trial' })
  const [newExtension, setNewExtension] = useState({ account_id: '', extension_number: '', display_name: '', sip_password: '', email: '' })

  const supabase = createClient()

  // ── THEME ──────────────────────────────────────────────────────────────────
  // Dark mode: true dark (#111827 base) with real contrast — not near-black-on-black
  // Light mode: clean white/gray with proper hierarchy
  const d = dark
  const th = {
    page:        d ? 'bg-[#0f1117] text-gray-100'              : 'bg-[#f3f4f6] text-gray-900',
    header:      d ? 'bg-[#1a1d27] border-[#2d3148]'          : 'bg-white border-gray-200',
    surface:     d ? 'bg-[#1a1d27] border-[#2d3148]'          : 'bg-white border-gray-200',
    surface2:    d ? 'bg-[#22263a]'                            : 'bg-gray-50',
    input:       d ? 'bg-[#0f1117] border-[#2d3148] text-gray-100 placeholder-gray-500 focus:border-[#4f6ef7]'
                   : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500',
    btn:         d ? 'bg-[#22263a] hover:bg-[#2d3148] text-gray-200 border border-[#2d3148]'
                   : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
    muted:       d ? 'text-gray-400'                           : 'text-gray-500',
    bodyText:    d ? 'text-gray-100'                           : 'text-gray-900',
    subText:     d ? 'text-gray-400'                           : 'text-gray-500',
    monoText:    d ? 'text-gray-300'                           : 'text-gray-600',
    row:         d ? 'border-[#2d3148] hover:bg-[#22263a]'    : 'border-gray-100 hover:bg-gray-50',
    rowDivider:  d ? 'border-[#2d3148]'                       : 'border-gray-100',
    modal:       d ? 'bg-[#1a1d27] border-[#2d3148]'          : 'bg-white border-gray-200',
    modalLabel:  d ? 'text-gray-400'                           : 'text-gray-500',
    tabBar:      d ? 'bg-[#0f1117] border-[#2d3148]'          : 'bg-gray-100 border-gray-200',
    tabActive:   d ? 'bg-[#1a1d27] text-white shadow-sm'      : 'bg-white text-gray-900 shadow-sm',
    tabInactive: d ? 'text-gray-500 hover:text-gray-200'      : 'text-gray-500 hover:text-gray-800',
    emptyText:   d ? 'text-gray-500'                          : 'text-gray-400',
    sectionHead: d ? 'text-gray-100'                          : 'text-gray-800',
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accountsRes, extensionsRes, callsRes] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('extensions').select('*, accounts(name)').order('created_at', { ascending: false }),
        supabase.from('call_detail_records').select('*').order('created_at', { ascending: false }).limit(100),
      ])

      const allAccounts: Account[] = accountsRes.data || []
      const allExtensions = (extensionsRes.data || []).map((e: any) => ({
        ...e, account_name: e.accounts?.name
      }))
      const allCalls: CallRecord[] = callsRes.data || []

      setAccounts(allAccounts)
      setExtensions(allExtensions)
      setCalls(allCalls)
      setStats({
        totalAccounts: allAccounts.length,
        activeAccounts: allAccounts.filter(a => a.status === 'active').length,
        trialAccounts: allAccounts.filter(a => a.status === 'trial').length,
        totalExtensions: allExtensions.length,
        totalCalls: allCalls.length,
        totalUsers: 0,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    if (password === SUPER_ADMIN_PASSWORD) {
      setAuth({ type: 'super_admin' })
      loadData()
    } else {
      setLoginError('Incorrect password. Please try again.')
    }
  }

  async function handleCreateAccount() {
    if (!newAccount.name || !newAccount.slug || !newAccount.sip_domain) {
      setActionMessage('Name, slug and SIP domain are required.')
      return
    }
    setActionLoading(true)
    const { error } = await supabase.from('accounts').insert([{
      name: newAccount.name,
      slug: newAccount.slug,
      sip_domain: newAccount.sip_domain,
      brand_primary_color: newAccount.brand_primary_color,
      status: newAccount.status,
    }])
    if (error) {
      setActionMessage('Error: ' + error.message)
    } else {
      setActionMessage('Account created successfully.')
      setNewAccount({ name: '', slug: '', sip_domain: '', brand_primary_color: '#0C2C68', status: 'trial' })
      setModalType(null)
      loadData()
    }
    setActionLoading(false)
  }

  async function handleCreateExtension() {
    if (!newExtension.account_id || !newExtension.extension_number || !newExtension.sip_password) {
      setActionMessage('Account, extension number and SIP password are required.')
      return
    }
    setActionLoading(true)
    const { error } = await supabase.from('extensions').insert([{
      account_id: newExtension.account_id,
      extension_number: newExtension.extension_number,
      display_name: newExtension.display_name,
      sip_password: newExtension.sip_password,
      email: newExtension.email,
      active: true,
    }])
    if (error) {
      setActionMessage('Error: ' + error.message)
    } else {
      setActionMessage('Extension created successfully.')
      setNewExtension({ account_id: '', extension_number: '', display_name: '', sip_password: '', email: '' })
      setModalType(null)
      loadData()
    }
    setActionLoading(false)
  }

  async function handleToggleAccountStatus(account: Account) {
    const newStatus = account.status === 'active' ? 'suspended' : 'active'
    setActionLoading(true)
    await supabase.from('accounts').update({ status: newStatus }).eq('id', account.id)
    setActionLoading(false)
    loadData()
  }

  async function handleToggleExtension(ext: Extension) {
    await supabase.from('extensions').update({ active: !ext.active }).eq('id', ext.id)
    loadData()
  }

  const filteredAccounts = accounts.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.slug.includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const filteredExtensions = extensions.filter(e =>
    !search || e.extension_number.includes(search) || (e.display_name || '').toLowerCase().includes(search.toLowerCase()) || (e.account_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (status: string) => {
    if (status === 'active') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    if (status === 'trial') return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    if (status === 'suspended') return 'text-red-400 bg-red-400/10 border-red-400/30'
    return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
  }

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────────
  if (auth.type === 'none') {
    return (
      <div className={`min-h-screen ${th.page} flex items-center justify-center p-4`}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className={`text-2xl font-bold mb-1 ${th.bodyText}`}>UnifyLine</div>
            <div className={`text-xs uppercase tracking-widest ${th.muted}`}>Super Admin</div>
          </div>
          <div className={`${th.surface} border rounded-2xl p-8`}>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${th.modalLabel}`}>Admin Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${th.input}`}
                  autoFocus
                />
              </div>
              {loginError && <div className="text-red-400 text-sm">{loginError}</div>}
              <button type="submit" className="w-full py-3 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl font-semibold text-sm transition-colors">
                Enter Admin Portal →
              </button>
            </form>
          </div>
          <div className={`text-center mt-6 text-xs ${th.muted}`}>UnifyLine · Admin Portal · Restricted Access</div>
        </div>
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'accounts', label: 'Accounts' },
    { key: 'extensions', label: 'Extensions' },
    { key: 'users', label: 'Users' },
    { key: 'calls', label: 'Call Logs' },
    { key: 'system', label: 'System' },
  ]

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${th.page} transition-colors duration-200`}>

      {/* Header */}
      <header className={`${th.header} border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10`}>
        <div className="flex items-center gap-6">
          <div className={`text-base font-bold ${th.bodyText}`}>
            UnifyLine <span className={`text-xs font-normal ml-1 ${th.muted}`}>Admin</span>
          </div>
          {/* Tab bar inline in header */}
          <div className={`flex gap-0.5 rounded-lg p-1 border ${th.tabBar}`}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setActionMessage('') }}
                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${tab === t.key ? th.tabActive : th.tabInactive}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDark(!d)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${th.btn}`}>
            {d ? '☀ Light' : '☾ Dark'}
          </button>
          <button onClick={() => setAuth({ type: 'none' })}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20 transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total Accounts', value: stats.totalAccounts, color: '' },
              { label: 'Active', value: stats.activeAccounts, color: 'text-emerald-400' },
              { label: 'Trial', value: stats.trialAccounts, color: 'text-amber-400' },
              { label: 'Extensions', value: stats.totalExtensions, color: '' },
              { label: 'Call Records', value: stats.totalCalls, color: '' },
              { label: 'Admin', value: 'v1.0', color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className={`${th.surface} border rounded-xl p-4`}>
                <div className={`text-2xl font-bold ${s.color || th.bodyText}`}>{s.value}</div>
                <div className={`text-xs mt-1 ${th.muted}`}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className={`w-6 h-6 border-2 border-current opacity-30 border-t-current rounded-full animate-spin ${th.muted}`} />
          </div>
        )}

        {/* Action message */}
        {actionMessage && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm flex items-center justify-between">
            {actionMessage}
            <button onClick={() => setActionMessage('')} className="text-blue-400/50 hover:text-blue-400 ml-4">✕</button>
          </div>
        )}

        {/* Search + filters */}
        {(tab === 'accounts' || tab === 'extensions' || tab === 'calls') && (
          <div className="flex gap-3 mb-5">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className={`flex-1 px-4 py-2 rounded-xl border text-sm outline-none transition-colors ${th.input}`} />
            {tab === 'accounts' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${th.input}`}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            )}
            {tab === 'accounts' && (
              <button onClick={() => setModalType('new_account')}
                className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                + New Account
              </button>
            )}
            {tab === 'extensions' && (
              <button onClick={() => setModalType('new_extension')}
                className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                + New Extension
              </button>
            )}
          </div>
        )}

        {/* ── ACCOUNTS TAB ── */}
        {tab === 'accounts' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                  {['Account', 'Slug', 'SIP Domain', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(account => (
                  <tr key={account.id} className={`border-b ${th.row} transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: account.brand_primary_color || '#0C2C68' }} />
                        <span className={`font-medium ${th.bodyText}`}>{account.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${th.monoText}`}>{account.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${th.monoText}`}>{account.sip_domain}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{new Date(account.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleAccountStatus(account)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${account.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-400/20'}`}>
                        {account.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No accounts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── EXTENSIONS TAB ── */}
        {tab === 'extensions' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                  {['Ext.', 'Name', 'Account', 'Email', 'SIP Password', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExtensions.map(ext => (
                  <tr key={ext.id} className={`border-b ${th.row} transition-colors`}>
                    <td className="px-4 py-3 font-mono font-bold text-[#4f6ef7]">{ext.extension_number}</td>
                    <td className={`px-4 py-3 font-medium ${th.bodyText}`}>{ext.display_name || '—'}</td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{ext.account_name || '—'}</td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{ext.email || '—'}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{ext.sip_password}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ext.active ? statusColor('active') : statusColor('suspended')}`}>
                        {ext.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleExtension(ext)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${ext.active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-400/20'}`}>
                        {ext.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredExtensions.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No extensions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                  {['Email', 'Name', 'Account', 'Role', 'Joined'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>
                    User management coming soon — link auth users to accounts via account_users table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── CALL LOGS TAB ── */}
        {tab === 'calls' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                  {['From', 'To', 'Direction', 'Duration', 'AI Summary', 'Date'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.filter(c => !search || c.from_number?.includes(search) || c.to_number?.includes(search)).map(call => (
                  <tr key={call.id} className={`border-b ${th.row} transition-colors`}>
                    <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.from_number}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.to_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${call.direction === 'inbound' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-blue-400 bg-blue-400/10 border-blue-400/30'}`}>
                        {call.direction}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{call.duration_sec}s</td>
                    <td className={`px-4 py-3 text-xs ${th.subText} max-w-xs truncate`}>{call.ai_summary || '—'}</td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{new Date(call.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No call records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SYSTEM TAB ── */}
        {tab === 'system' && !loading && (
          <div className="space-y-4">
            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>Infrastructure</h3>
              <div className="space-y-0">
                {[
                  { label: 'FreeSWITCH Server', value: '198.58.114.103', status: 'online' },
                  { label: 'SIP Port', value: '5060 (UDP/TCP)', status: 'online' },
                  { label: 'WebSocket (WSS)', value: 'wss://198.58.114.103:7443', status: 'online' },
                  { label: 'TURN Server', value: '198.58.114.103:3478', status: 'online' },
                  { label: 'AI Receptionist', value: 'n8n + Claude API', status: 'online' },
                  { label: 'Supabase Project', value: 'unifyline', status: 'online' },
                ].map((item, i, arr) => (
                  <div key={item.label} className={`flex items-center justify-between py-3 text-sm ${i < arr.length - 1 ? `border-b ${th.rowDivider}` : ''}`}>
                    <span className={th.subText}>{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs ${th.monoText}`}>{item.value}</span>
                      <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/30">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>SIP Domains</h3>
              <div className="space-y-0 text-sm">
                {accounts.map((a, i, arr) => (
                  <div key={a.id} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? `border-b ${th.rowDivider}` : ''}`}>
                    <span className={`font-medium ${th.bodyText}`}>{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs ${th.monoText}`}>{a.sip_domain}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(a.status)}`}>{a.status}</span>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className={`py-4 text-sm ${th.emptyText}`}>No accounts configured</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: New Account ── */}
      {modalType === 'new_account' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-semibold text-base ${th.bodyText}`}>New Account</h3>
              <button onClick={() => { setModalType(null); setActionMessage('') }} className={`text-lg leading-none ${th.muted} hover:${th.bodyText}`}>✕</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Account Name', key: 'name', placeholder: 'e.g. MTI Premium Charters' },
                { label: 'Slug', key: 'slug', placeholder: 'e.g. mti' },
                { label: 'SIP Domain', key: 'sip_domain', placeholder: 'e.g. mti.unifyline.local' },
                { label: 'Brand Color', key: 'brand_primary_color', placeholder: '#0C2C68' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>{f.label}</label>
                  <input value={(newAccount as any)[f.key]} onChange={e => setNewAccount({ ...newAccount, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`} />
                </div>
              ))}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Status</label>
                <select value={newAccount.status} onChange={e => setNewAccount({ ...newAccount, status: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
            {actionMessage && <div className="mt-3 text-sm text-red-400">{actionMessage}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModalType(null); setActionMessage('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${th.btn}`}>Cancel</button>
              <button onClick={handleCreateAccount} disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: New Extension ── */}
      {modalType === 'new_extension' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-semibold text-base ${th.bodyText}`}>New Extension</h3>
              <button onClick={() => { setModalType(null); setActionMessage('') }} className={`text-lg leading-none ${th.muted} hover:${th.bodyText}`}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Account</label>
                <select value={newExtension.account_id} onChange={e => setNewExtension({ ...newExtension, account_id: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`}>
                  <option value="">Select account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Extension Number', key: 'extension_number', placeholder: 'e.g. 203' },
                { label: 'Display Name', key: 'display_name', placeholder: 'e.g. John Smith' },
                { label: 'SIP Password', key: 'sip_password', placeholder: 'e.g. MTI203secure!' },
                { label: 'Email (optional)', key: 'email', placeholder: 'john@company.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>{f.label}</label>
                  <input value={(newExtension as any)[f.key]} onChange={e => setNewExtension({ ...newExtension, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`} />
                </div>
              ))}
            </div>
            {actionMessage && <div className="mt-3 text-sm text-red-400">{actionMessage}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModalType(null); setActionMessage('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${th.btn}`}>Cancel</button>
              <button onClick={handleCreateExtension} disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Create Extension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
