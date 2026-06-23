'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const SUPER_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'UL-Admin-2026!'

type AuthState = { type: 'none' } | { type: 'super_admin' }
type Tab = 'accounts' | 'extensions' | 'users' | 'calls' | 'system'
type ModalType = 'new_account' | 'new_extension' | 'invite_user' | 'account_detail' | null

type Account = {
  id: string
  name: string
  slug: string
  status: string
  sip_domain: string
  brand_primary_color: string
  created_at: string
  _extCount?: number
  _userCount?: number
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

type AccountUser = {
  id: string
  user_id: string
  account_id: string
  role: string
  created_at: string
  account_name?: string
  display_name?: string
  extension_number?: string
  email?: string
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
  trialAccounts: number
  totalExtensions: number
  totalCalls: number
  totalUsers: number
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
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([])
  const [calls, setCalls] = useState<CallRecord[]>([])

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [newAccount, setNewAccount] = useState({ name: '', slug: '', sip_domain: '', brand_primary_color: '#0C2C68', status: 'trial' })
  const [newExtension, setNewExtension] = useState({ account_id: '', extension_number: '', display_name: '', sip_password: '', email: '' })
  const [inviteUser, setInviteUser] = useState({ email: '', display_name: '', account_id: '', extension_number: '', role: 'user' })

  const supabase = createClient()

  // ── THEME ──────────────────────────────────────────────────────────────────
  const d = dark
  const th = {
    page:        d ? 'bg-[#0f1117] text-gray-100'           : 'bg-[#f3f4f6] text-gray-900',
    header:      d ? 'bg-[#1a1d27] border-[#2d3148]'       : 'bg-white border-gray-200',
    surface:     d ? 'bg-[#1a1d27] border-[#2d3148]'       : 'bg-white border-gray-200',
    surface2:    d ? 'bg-[#22263a]'                         : 'bg-gray-50',
    input:       d ? 'bg-[#0f1117] border-[#2d3148] text-gray-100 placeholder-gray-500 focus:border-[#4f6ef7]'
                   : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500',
    btn:         d ? 'bg-[#22263a] hover:bg-[#2d3148] text-gray-200 border border-[#2d3148]'
                   : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
    muted:       d ? 'text-gray-400'                        : 'text-gray-500',
    bodyText:    d ? 'text-gray-100'                        : 'text-gray-900',
    subText:     d ? 'text-gray-400'                        : 'text-gray-500',
    monoText:    d ? 'text-gray-300'                        : 'text-gray-600',
    row:         d ? 'border-[#2d3148] hover:bg-[#22263a]' : 'border-gray-100 hover:bg-gray-50',
    rowDivider:  d ? 'border-[#2d3148]'                    : 'border-gray-100',
    modal:       d ? 'bg-[#1a1d27] border-[#2d3148]'       : 'bg-white border-gray-200',
    modalLabel:  d ? 'text-gray-400'                        : 'text-gray-500',
    tabBar:      d ? 'bg-[#0f1117] border-[#2d3148]'       : 'bg-gray-100 border-gray-200',
    tabActive:   d ? 'bg-[#1a1d27] text-white shadow-sm'   : 'bg-white text-gray-900 shadow-sm',
    tabInactive: d ? 'text-gray-500 hover:text-gray-200'   : 'text-gray-500 hover:text-gray-800',
    emptyText:   d ? 'text-gray-500'                       : 'text-gray-400',
    sectionHead: d ? 'text-gray-100'                       : 'text-gray-800',
  }

  // ── DATA LOADING ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accountsRes, extensionsRes, callsRes, accountUsersRes] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('extensions').select('*, accounts(name)').order('created_at', { ascending: false }),
        supabase.from('call_detail_records').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('account_users').select('*, accounts(name), extensions(extension_number, display_name)').order('created_at', { ascending: false }),
      ])

      const allAccounts: Account[] = (accountsRes.data || [])
      const allExtensions: Extension[] = (extensionsRes.data || []).map((e: any) => ({
        ...e, account_name: e.accounts?.name
      }))
      const allCalls: CallRecord[] = callsRes.data || []
      const allAccountUsers: AccountUser[] = (accountUsersRes.data || []).map((u: any) => ({
        id: u.id,
        user_id: u.user_id,
        account_id: u.account_id,
        role: u.role,
        created_at: u.created_at,
        account_name: u.accounts?.name,
        display_name: u.extensions?.display_name,
        extension_number: u.extensions?.extension_number,
        email: u.email,
      }))

      // Annotate accounts with counts
      const annotated = allAccounts.map(a => ({
        ...a,
        _extCount: allExtensions.filter(e => e.account_id === a.id).length,
        _userCount: allAccountUsers.filter(u => u.account_id === a.id).length,
      }))

      setAccounts(annotated)
      setExtensions(allExtensions)
      setCalls(allCalls)
      setAccountUsers(allAccountUsers)
      setStats({
        totalAccounts: allAccounts.length,
        activeAccounts: allAccounts.filter(a => a.status === 'active').length,
        trialAccounts: allAccounts.filter(a => a.status === 'trial').length,
        totalExtensions: allExtensions.length,
        totalCalls: allCalls.length,
        totalUsers: allAccountUsers.length,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  // ── AUTH ───────────────────────────────────────────────────────────────────
  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    if (password === SUPER_ADMIN_PASSWORD) {
      setAuth({ type: 'super_admin' })
      loadData()
    } else {
      setLoginError('Incorrect password.')
    }
  }

  // ── ACCOUNT ACTIONS ────────────────────────────────────────────────────────
  async function handleCreateAccount() {
    setActionError('')
    if (!newAccount.name || !newAccount.slug || !newAccount.sip_domain) {
      setActionError('Name, slug and SIP domain are required.')
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
    setActionLoading(false)
    if (error) { setActionError(error.message); return }
    setActionMessage('Account created successfully.')
    setNewAccount({ name: '', slug: '', sip_domain: '', brand_primary_color: '#0C2C68', status: 'trial' })
    setModalType(null)
    loadData()
  }

  async function handleToggleAccountStatus(account: Account) {
    const newStatus = account.status === 'active' ? 'suspended' : 'active'
    await supabase.from('accounts').update({ status: newStatus }).eq('id', account.id)
    loadData()
  }

  // ── EXTENSION ACTIONS ──────────────────────────────────────────────────────
  async function handleCreateExtension() {
    setActionError('')
    if (!newExtension.account_id || !newExtension.extension_number || !newExtension.sip_password) {
      setActionError('Account, extension number and SIP password are required.')
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
    setActionLoading(false)
    if (error) { setActionError(error.message); return }
    setActionMessage('Extension created successfully.')
    setNewExtension({ account_id: '', extension_number: '', display_name: '', sip_password: '', email: '' })
    setModalType(null)
    loadData()
  }

  async function handleToggleExtension(ext: Extension) {
    await supabase.from('extensions').update({ active: !ext.active }).eq('id', ext.id)
    loadData()
  }

  async function handleDeleteExtension(ext: Extension) {
    if (!confirm(`Delete extension ${ext.extension_number} (${ext.display_name || 'unnamed'})? This cannot be undone.`)) return
    await supabase.from('extensions').delete().eq('id', ext.id)
    setActionMessage(`Extension ${ext.extension_number} deleted.`)
    loadData()
  }

  // ── USER ACTIONS ───────────────────────────────────────────────────────────
  async function handleInviteUser() {
    setActionError('')
    if (!inviteUser.email || !inviteUser.account_id) {
      setActionError('Email and account are required.')
      return
    }
    setActionLoading(true)
    // Send Supabase magic link invite
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteUser.email)
    if (error) {
      // Supabase admin not available client-side — fall back to creating account_users entry
      // and noting the user needs to sign up manually
      setActionError('Note: User must sign up at /auth/login first, then link their account below. Or use Supabase Dashboard → Auth → Invite User.')
      setActionLoading(false)
      return
    }
    // Link user to account
    if (data?.user) {
      await supabase.from('account_users').insert([{
        user_id: data.user.id,
        account_id: inviteUser.account_id,
        role: inviteUser.role,
      }])
    }
    setActionLoading(false)
    setActionMessage('User invited successfully.')
    setInviteUser({ email: '', display_name: '', account_id: '', extension_number: '', role: 'user' })
    setModalType(null)
    loadData()
  }

  async function handleLinkUserToAccount(userId: string, accountId: string, role: string) {
    const { error } = await supabase.from('account_users').insert([{ user_id: userId, account_id: accountId, role }])
    if (error) setActionError(error.message)
    else { setActionMessage('User linked to account.'); loadData() }
  }

  async function handleRemoveUserFromAccount(accountUserId: string) {
    if (!confirm('Remove this user from the account?')) return
    await supabase.from('account_users').delete().eq('id', accountUserId)
    setActionMessage('User removed from account.')
    loadData()
  }

  // ── FILTERS ────────────────────────────────────────────────────────────────
  const filteredAccounts = accounts.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.slug.includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const filteredExtensions = extensions.filter(e => {
    const matchSearch = !search || e.extension_number.includes(search) ||
      (e.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.account_name || '').toLowerCase().includes(search.toLowerCase())
    const matchAccount = filterAccount === 'all' || e.account_id === filterAccount
    return matchSearch && matchAccount
  })

  const filteredUsers = accountUsers.filter(u =>
    !search ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.account_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredCalls = calls.filter(c => {
    const matchSearch = !search || c.from_number?.includes(search) || c.to_number?.includes(search)
    const matchAccount = filterAccount === 'all' || c.account_id === filterAccount
    return matchSearch && matchAccount
  })

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const statusColor = (status: string) => {
    if (status === 'active') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    if (status === 'trial') return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    if (status === 'suspended') return 'text-red-400 bg-red-400/10 border-red-400/30'
    return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
  }

  const closeModal = () => { setModalType(null); setActionError('') }

  function formatDuration(sec: number) {
    if (!sec) return '0s'
    if (sec < 60) return `${sec}s`
    return `${Math.floor(sec / 60)}m ${sec % 60}s`
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
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${th.input}`}
                  autoFocus />
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

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'accounts',   label: 'Accounts',   count: stats?.totalAccounts },
    { key: 'extensions', label: 'Extensions', count: stats?.totalExtensions },
    { key: 'users',      label: 'Users',      count: stats?.totalUsers },
    { key: 'calls',      label: 'Call Logs',  count: stats?.totalCalls },
    { key: 'system',     label: 'System' },
  ]

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${th.page} transition-colors duration-200`}>

      {/* ── HEADER ── */}
      <header className={`${th.header} border-b px-6 py-3 sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className={`text-base font-bold shrink-0 ${th.bodyText}`}>
            UnifyLine <span className={`text-xs font-normal ml-1 ${th.muted}`}>Admin</span>
          </div>

          {/* Tabs — centered */}
          <div className={`flex gap-0.5 rounded-lg p-1 border ${th.tabBar}`}>
            {TABS.map(t => (
              <button key={t.key}
                onClick={() => { setTab(t.key); setSearch(''); setFilterAccount('all'); setActionMessage(''); setActionError('') }}
                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium flex items-center gap-1.5 ${tab === t.key ? th.tabActive : th.tabInactive}`}>
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-black/10 text-current' : 'bg-gray-500/20 text-gray-400'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-xs px-2 py-1 rounded-md border font-medium text-emerald-400 bg-emerald-400/10 border-emerald-400/20`}>
              ● Super Admin
            </div>
            <button onClick={() => setDark(!d)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${th.btn}`}>
              {d ? '☀ Light' : '☾ Dark'}
            </button>
            <button onClick={() => setAuth({ type: 'none' })}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── STATS ROW ── */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total Accounts', value: stats.totalAccounts, color: '' },
              { label: 'Active',         value: stats.activeAccounts,  color: 'text-emerald-400' },
              { label: 'Trial',          value: stats.trialAccounts,   color: 'text-amber-400' },
              { label: 'Extensions',     value: stats.totalExtensions, color: '' },
              { label: 'Users',          value: stats.totalUsers,      color: 'text-blue-400' },
              { label: 'Call Records',   value: stats.totalCalls,      color: '' },
            ].map(s => (
              <div key={s.label} className={`${th.surface} border rounded-xl p-4 cursor-default`}>
                <div className={`text-2xl font-bold ${s.color || th.bodyText}`}>{s.value}</div>
                <div className={`text-xs mt-1 ${th.muted}`}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className={`w-6 h-6 border-2 border-current opacity-20 border-t-current rounded-full animate-spin ${th.muted}`} />
          </div>
        )}

        {/* Global success message */}
        {actionMessage && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
            {actionMessage}
            <button onClick={() => setActionMessage('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ── TOOLBAR ── */}
        {(tab === 'accounts' || tab === 'extensions' || tab === 'calls' || tab === 'users') && (
          <div className="flex gap-3 mb-5 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              className={`flex-1 min-w-[200px] px-4 py-2 rounded-xl border text-sm outline-none transition-colors ${th.input}`} />

            {tab === 'accounts' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            )}

            {(tab === 'extensions' || tab === 'calls') && (
              <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="all">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}

            {tab === 'accounts' && (
              <button onClick={() => { setModalType('new_account'); setActionError('') }}
                className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                + New Account
              </button>
            )}
            {tab === 'extensions' && (
              <button onClick={() => { setModalType('new_extension'); setActionError('') }}
                className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                + New Extension
              </button>
            )}
            {tab === 'users' && (
              <button onClick={() => { setModalType('invite_user'); setActionError('') }}
                className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                + Link User
              </button>
            )}
          </div>
        )}

        {/* ══ ACCOUNTS TAB ══ */}
        {tab === 'accounts' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                  {['Account', 'Slug', 'SIP Domain', 'Exts', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(account => (
                  <tr key={account.id} className={`border-b ${th.row} transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md shrink-0" style={{ background: account.brand_primary_color || '#0C2C68' }} />
                        <span className={`font-medium ${th.bodyText}`}>{account.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`font-mono text-xs ${th.monoText}`}>{account.slug}</span></td>
                    <td className="px-4 py-3"><span className={`font-mono text-xs ${th.monoText}`}>{account.sip_domain}</span></td>
                    <td className={`px-4 py-3 text-sm font-medium ${th.bodyText}`}>{account._extCount ?? 0}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${th.bodyText}`}>{account._userCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{new Date(account.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleAccountStatus(account)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                            account.status === 'active'
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-400/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-400/20'
                          }`}>
                          {account.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button onClick={() => { setFilterAccount(account.id); setTab('extensions') }}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${th.btn}`}>
                          Exts →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 && (
                  <tr><td colSpan={8} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No accounts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ EXTENSIONS TAB ══ */}
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
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleExtension(ext)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                            ext.active
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-400/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-400/20'
                          }`}>
                          {ext.active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDeleteExtension(ext)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400/60 hover:bg-red-500/15 hover:text-red-400 border border-red-400/10 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExtensions.length === 0 && (
                  <tr><td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No extensions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ USERS TAB ══ */}
        {tab === 'users' && !loading && (
          <div className="space-y-4">
            {/* Info banner */}
            <div className={`px-4 py-3 rounded-xl border text-sm ${d ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              <strong>Users</strong> are people linked to accounts via the <code className="text-xs bg-black/20 px-1 rounded">account_users</code> table.
              To invite a brand-new user, go to <strong>Supabase Dashboard → Authentication → Users → Invite</strong>, then link them here.
            </div>

            <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                    {['Display Name', 'Ext.', 'Account', 'Role', 'User ID', 'Linked', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`border-b ${th.row} transition-colors`}>
                      <td className={`px-4 py-3 font-medium ${th.bodyText}`}>{u.display_name || '—'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#4f6ef7]">{u.extension_number || '—'}</td>
                      <td className={`px-4 py-3 text-xs ${th.subText}`}>{u.account_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          u.role === 'admin' ? 'text-purple-400 bg-purple-400/10 border-purple-400/30' : statusColor('active')
                        }`}>{u.role || 'user'}</span>
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs ${th.monoText} max-w-[120px] truncate`} title={u.user_id}>
                        {u.user_id?.slice(0, 8)}…
                      </td>
                      <td className={`px-4 py-3 text-xs ${th.subText}`}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleRemoveUserFromAccount(u.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20 transition-colors">
                          Unlink
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>
                      No users linked yet. Use "+ Link User" to connect a Supabase auth user to an account.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ CALL LOGS TAB ══ */}
        {tab === 'calls' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                  {['From', 'To', 'Account', 'Direction', 'Duration', 'AI Summary', 'Date'].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map(call => {
                  const acctName = accounts.find(a => a.id === call.account_id)?.name
                  return (
                    <tr key={call.id} className={`border-b ${th.row} transition-colors`}>
                      <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.from_number}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.to_number || '—'}</td>
                      <td className={`px-4 py-3 text-xs ${th.subText}`}>{acctName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          call.direction === 'inbound'
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                            : 'text-blue-400 bg-blue-400/10 border-blue-400/30'
                        }`}>{call.direction}</span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${th.subText}`}>{formatDuration(call.duration_sec)}</td>
                      <td className={`px-4 py-3 text-xs ${th.subText} max-w-xs truncate`}>{call.ai_summary || '—'}</td>
                      <td className={`px-4 py-3 text-xs ${th.subText}`}>{new Date(call.created_at).toLocaleString()}</td>
                    </tr>
                  )
                })}
                {filteredCalls.length === 0 && (
                  <tr><td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No call records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ SYSTEM TAB ══ */}
        {tab === 'system' && !loading && (
          <div className="space-y-4">
            {/* Super Admin capabilities */}
            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>Your Privileges — Super Admin</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Create Accounts', desc: 'Add new tenant accounts' },
                  { label: 'Suspend / Activate', desc: 'Control account status' },
                  { label: 'Create Extensions', desc: 'Add SIP extensions to any account' },
                  { label: 'Enable / Disable Exts', desc: 'Toggle extensions on/off' },
                  { label: 'Delete Extensions', desc: 'Permanently remove extensions' },
                  { label: 'View All Call Logs', desc: 'Across all tenant accounts' },
                  { label: 'Link / Unlink Users', desc: 'Connect users to accounts' },
                  { label: 'Filter by Account', desc: 'Drill into any tenant' },
                  { label: 'System Overview', desc: 'Infrastructure status' },
                ].map(p => (
                  <div key={p.label} className={`${th.surface2} rounded-xl p-3 border ${th.rowDivider}`}>
                    <div className={`text-xs font-semibold text-emerald-400 mb-0.5`}>✓ {p.label}</div>
                    <div className={`text-xs ${th.subText}`}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>Infrastructure</h3>
              <div className="space-y-0">
                {[
                  { label: 'FreeSWITCH Server', value: '198.58.114.103' },
                  { label: 'SIP Port', value: '5060 (UDP/TCP)' },
                  { label: 'WebSocket (WSS)', value: 'wss://198.58.114.103:7443' },
                  { label: 'TURN Server', value: '198.58.114.103:3478' },
                  { label: 'AI Receptionist', value: 'n8n + Claude API' },
                  { label: 'Supabase Project', value: 'unifyline' },
                ].map((item, i, arr) => (
                  <div key={item.label} className={`flex items-center justify-between py-3 text-sm ${i < arr.length - 1 ? `border-b ${th.rowDivider}` : ''}`}>
                    <span className={th.subText}>{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs ${th.monoText}`}>{item.value}</span>
                      <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/30">online</span>
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
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded" style={{ background: a.brand_primary_color || '#0C2C68' }} />
                      <span className={`font-medium ${th.bodyText}`}>{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs ${th.monoText}`}>{a.sip_domain}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(a.status)}`}>{a.status}</span>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && <p className={`py-4 text-sm ${th.emptyText}`}>No accounts configured</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL: New Account ══ */}
      {modalType === 'new_account' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-semibold text-base ${th.bodyText}`}>New Account</h3>
              <button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>✕</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Account Name', key: 'name', placeholder: 'e.g. MTI Premium Charters' },
                { label: 'Slug', key: 'slug', placeholder: 'e.g. mti' },
                { label: 'SIP Domain', key: 'sip_domain', placeholder: 'e.g. mti.unifyline.local' },
                { label: 'Brand Color (hex)', key: 'brand_primary_color', placeholder: '#0C2C68' },
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
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${th.btn}`}>Cancel</button>
              <button onClick={handleCreateAccount} disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: New Extension ══ */}
      {modalType === 'new_extension' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-semibold text-base ${th.bodyText}`}>New Extension</h3>
              <button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Account</label>
                <select value={newExtension.account_id} onChange={e => setNewExtension({ ...newExtension, account_id: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`}>
                  <option value="">Select account…</option>
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
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${th.btn}`}>Cancel</button>
              <button onClick={handleCreateExtension} disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Creating…' : 'Create Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Link User to Account ══ */}
      {modalType === 'invite_user' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-base ${th.bodyText}`}>Link User to Account</h3>
              <button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>✕</button>
            </div>
            <p className={`text-xs mb-4 ${th.subText}`}>
              The user must already exist in Supabase Auth. Paste their User ID from
              Supabase Dashboard → Authentication → Users.
            </p>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Supabase User ID</label>
                <input value={inviteUser.email} onChange={e => setInviteUser({ ...inviteUser, email: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none font-mono transition-colors ${th.input}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Account</label>
                <select value={inviteUser.account_id} onChange={e => setInviteUser({ ...inviteUser, account_id: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`}>
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Role</label>
                <select value={inviteUser.role} onChange={e => setInviteUser({ ...inviteUser, role: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${th.input}`}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm transition-colors ${th.btn}`}>Cancel</button>
              <button
                onClick={() => handleLinkUserToAccount(inviteUser.email, inviteUser.account_id, inviteUser.role)}
                disabled={actionLoading || !inviteUser.email || !inviteUser.account_id}
                className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Linking…' : 'Link User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
