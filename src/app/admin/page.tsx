'use client'
import { useState, useCallback } from 'react'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'UL-Admin-2026!'

type AuthState = { type: 'none' } | { type: 'super_admin' }
type Tab = 'accounts' | 'extensions' | 'users' | 'calls' | 'costs' | 'leads' | 'system'
type ModalType = 'new_account' | 'new_extension' | 'invite_user' | 'assign_user' | null

type Account = {
  id: string; name: string; slug: string; status: string
  sip_domain: string; brand_primary_color: string; created_at: string
  _extCount?: number; _userCount?: number
}
type Extension = {
  id: string; account_id: string; extension_number: string; display_name: string
  sip_password: string; active: boolean; email: string
  created_at: string; account_name?: string; user_id?: string
}
type AuthUser = {
  id: string; email: string; created_at: string; last_sign_in: string | null
  account_id: string | null; account_name: string | null
  extension: string | null; display_name: string | null
  role: string | null; linked: boolean
}
type CallRecord = {
  id: string; from_number: string; to_number: string; duration_sec: number
  direction: string; ai_summary: string; created_at: string; account_id: string
  actual_duration_sec?: number; was_transferred?: boolean; estimated_cost_usd?: number
}
type Lead = {
  id: string; business_name: string; contact_name: string; email: string
  phone: string; industry: string; message: string; status: string; created_at: string
}
type Stats = {
  totalAccounts: number; activeAccounts: number; trialAccounts: number
  totalExtensions: number; totalCalls: number; totalUsers: number
  totalLeads: number; newLeads: number
}

export default function AdminPage() {
  const [auth, setAuth]           = useState<AuthState>({ type: 'none' })
  const [password, setPassword]   = useState('')
  const [loginError, setLoginError] = useState('')
  const [tab, setTab]             = useState<Tab>('accounts')
  const [loading, setLoading]     = useState(false)
  const [dark, setDark]           = useState(true)

  const [stats, setStats]           = useState<Stats | null>(null)
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [authUsers, setAuthUsers]   = useState<AuthUser[]>([])
  const [calls, setCalls]           = useState<CallRecord[]>([])
  const [leads, setLeads]           = useState<Lead[]>([])
  const [expandedLead, setExpandedLead] = useState<string | null>(null)

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [expandedCall, setExpandedCall] = useState<string | null>(null)

  const [modalType, setModalType]       = useState<ModalType>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError]   = useState('')

  const [newAccount, setNewAccount]     = useState({ name: '', slug: '', sip_domain: '', brand_primary_color: '#0C2C68', status: 'trial' })
  const [newExtension, setNewExtension] = useState({ account_id: '', extension_number: '', display_name: '', sip_password: '', email: '' })
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteAccount, setInviteAccount] = useState('')
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [assignForm, setAssignForm]     = useState({ account_id: '', extension_id: '', role: 'user' })

  // Ã¢â€â‚¬Ã¢â€â‚¬ THEME Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
    bodyText:    d ? 'text-gray-100'   : 'text-gray-900',
    subText:     d ? 'text-gray-400'   : 'text-gray-500',
    monoText:    d ? 'text-gray-300'   : 'text-gray-600',
    muted:       d ? 'text-gray-400'   : 'text-gray-500',
    row:         d ? 'border-[#2d3148] hover:bg-[#22263a]' : 'border-gray-100 hover:bg-gray-50',
    rowDivider:  d ? 'border-[#2d3148]' : 'border-gray-100',
    modal:       d ? 'bg-[#1a1d27] border-[#2d3148]' : 'bg-white border-gray-200',
    modalLabel:  d ? 'text-gray-400'   : 'text-gray-500',
    tabBar:      d ? 'bg-[#0f1117] border-[#2d3148]' : 'bg-gray-100 border-gray-200',
    tabActive:   d ? 'bg-[#1a1d27] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm',
    tabInactive: d ? 'text-gray-500 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800',
    emptyText:   d ? 'text-gray-500'   : 'text-gray-400',
    sectionHead: d ? 'text-gray-100'   : 'text-gray-800',
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ DATA LOADING (all via server-side API Ã¢â€ â€™ bypasses RLS) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_password: ADMIN_PASSWORD }),
      })
      const data = await res.json()
      if (!res.ok) { console.error('Admin data error:', data.error); return }

      const accts: Account[] = data.accounts || []
      const exts: Extension[] = data.extensions || []
      const users: AuthUser[] = data.authUsers || []
      const cls: CallRecord[] = data.calls || []
      const lds: Lead[] = data.leads || []

      setAccounts(accts.map(a => ({
        ...a,
        _extCount:  exts.filter(e => e.account_id === a.id).length,
        _userCount: users.filter(u => u.account_id === a.id).length,
      })))
      setExtensions(exts)
      setAuthUsers(users)
      setCalls(cls)
      setLeads(lds)
      setStats({
        totalAccounts:  accts.length,
        activeAccounts: accts.filter(a => a.status === 'active').length,
        trialAccounts:  accts.filter(a => a.status === 'trial').length,
        totalExtensions: exts.length,
        totalCalls:     cls.length,
        totalUsers:     users.length,
        totalLeads:     lds.length,
        newLeads:       lds.filter(l => l.status === 'new').length,
      })
    } catch (e) { console.error('loadAll error:', e) }
    setLoading(false)
  }, [])

  // Ã¢â€â‚¬Ã¢â€â‚¬ ACCOUNT ACTIONS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleCreateAccount() {
    setActionError('')
    if (!newAccount.name || !newAccount.slug || !newAccount.sip_domain) {
      setActionError('Name, slug and SIP domain are required.'); return
    }
    setActionLoading(true)
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'create', ...newAccount }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (!res.ok) { setActionError(data.error); return }
    setActionMessage('Account created.')
    setNewAccount({ name: '', slug: '', sip_domain: '', brand_primary_color: '#0C2C68', status: 'trial' })
    setModalType(null); loadAll()
  }

  async function handleToggleAccount(account: Account) {
    const newStatus = account.status === 'active' ? 'suspended' : 'active'
    await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'toggle', id: account.id, status: newStatus }),
    })
    loadAll()
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ EXTENSION ACTIONS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleCreateExtension() {
    setActionError('')
    if (!newExtension.account_id || !newExtension.extension_number || !newExtension.sip_password) {
      setActionError('Account, extension number and SIP password are required.'); return
    }
    setActionLoading(true)
    const res = await fetch('/api/admin/extensions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'create', ...newExtension }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (!res.ok) { setActionError(data.error); return }
    setActionMessage('Extension created.')
    setNewExtension({ account_id: '', extension_number: '', display_name: '', sip_password: '', email: '' })
    setModalType(null); loadAll()
  }

  async function handleToggleExtension(ext: Extension) {
    await fetch('/api/admin/extensions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'toggle', id: ext.id, active: !ext.active }),
    })
    loadAll()
  }

  async function handleDeleteExtension(ext: Extension) {
    if (!confirm(`Delete extension ${ext.extension_number}? Cannot be undone.`)) return
    await fetch('/api/admin/extensions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'delete', id: ext.id }),
    })
    setActionMessage(`Extension ${ext.extension_number} deleted.`); loadAll()
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ USER ACTIONS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleInviteUser() {
    setActionError('')
    if (!inviteEmail || !inviteAccount) { setActionError('Email and account are required.'); return }
    setActionLoading(true)
    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, email: inviteEmail, account_id: inviteAccount, role: 'user' }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (!res.ok) { setActionError(data.error); return }
    setActionMessage(data.message)
    setInviteEmail(''); setInviteAccount(''); setModalType(null); loadAll()
  }

  async function handleAssignUser() {
    setActionError('')
    if (!selectedUser || !assignForm.account_id || !assignForm.extension_id) {
      setActionError('Account and extension are required.'); return
    }
    setActionLoading(true)
    const res = await fetch('/api/admin/assign-extension', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_password: ADMIN_PASSWORD, action: 'link',
        user_id: selectedUser.id, account_id: assignForm.account_id,
        extension_id: assignForm.extension_id, role: assignForm.role,
      }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (!res.ok) { setActionError(data.error); return }
    setActionMessage(data.message)
    setModalType(null); setSelectedUser(null)
    setAssignForm({ account_id: '', extension_id: '', role: 'user' }); loadAll()
  }

  async function handleUnlinkUser(user: AuthUser) {
    if (!confirm(`Remove ${user.email} from ${user.account_name}?`)) return
    const res = await fetch('/api/admin/assign-extension', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'unlink', user_id: user.id }),
    })
    const data = await res.json()
    if (data.success) { setActionMessage('User unlinked.'); loadAll() }
    else setActionError(data.error)
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ FILTERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const filteredAccounts = accounts.filter(a => {
    const ms = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.slug.includes(search.toLowerCase())
    return ms && (filterStatus === 'all' || a.status === filterStatus)
  })
  const filteredExtensions = extensions.filter(e => {
    const ms = !search || e.extension_number.includes(search) || (e.display_name||'').toLowerCase().includes(search.toLowerCase()) || (e.account_name||'').toLowerCase().includes(search.toLowerCase())
    return ms && (filterAccount === 'all' || e.account_id === filterAccount)
  })
  const filteredUsers = authUsers.filter(u =>
    !search || (u.email||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.account_name||'').toLowerCase().includes(search.toLowerCase())
  )
  const filteredCalls = calls.filter(c => {
    const ms = !search || c.from_number?.includes(search) || c.to_number?.includes(search)
    return ms && (filterAccount === 'all' || c.account_id === filterAccount)
  })

  const filteredLeads = leads.filter(l => {
    if (!search) return true
    const s = search.toLowerCase()
    return l.business_name?.toLowerCase().includes(s) || l.contact_name?.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s)
  })

  async function handleUpdateLeadStatus(lead: Lead, status: string) {
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'update_status', id: lead.id, status }),
    })
    loadAll()
  }

  async function handleDeleteLead(lead: Lead) {
    if (!confirm(`Delete lead from ${lead.business_name}?`)) return
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_password: ADMIN_PASSWORD, action: 'delete', id: lead.id }),
    })
    loadAll()
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ HELPERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const sc = (s: string) => {
    if (s === 'active') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    if (s === 'trial')  return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    if (s === 'suspended') return 'text-red-400 bg-red-400/10 border-red-400/30'
    return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
  }
  const closeModal = () => { setModalType(null); setActionError(''); setSelectedUser(null) }
  const fmt = (s: number) => !s ? '0s' : s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`
  const switchTab = (t: Tab) => { setTab(t); setSearch(''); setFilterAccount('all'); setActionMessage(''); setActionError('') }
  const assignableExts = extensions.filter(e => e.account_id === assignForm.account_id)

  // Ã¢â€â‚¬Ã¢â€â‚¬ LOGIN Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (auth.type === 'none') {
    return (
      <div className={`min-h-screen ${th.page} flex items-center justify-center p-4`}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className={`text-2xl font-bold mb-1 ${th.bodyText}`}>UnifyLine</div>
            <div className={`text-xs uppercase tracking-widest ${th.muted}`}>Super Admin</div>
          </div>
          <div className={`${th.surface} border rounded-2xl p-8`}>
            <form onSubmit={e => { e.preventDefault(); if (password === ADMIN_PASSWORD) { setAuth({ type: 'super_admin' }); loadAll() } else setLoginError('Incorrect password.') }} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${th.modalLabel}`}>Admin Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" autoFocus className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${th.input}`} />
              </div>
              {loginError && <div className="text-red-400 text-sm">{loginError}</div>}
              <button type="submit" className="w-full py-3 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl font-semibold text-sm transition-colors">Enter Admin Portal Ã¢â€ â€™</button>
            </form>
          </div>
          <div className={`text-center mt-6 text-xs ${th.muted}`}>UnifyLine Ã‚Â· Admin Portal Ã‚Â· Restricted Access</div>
        </div>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'accounts',   label: 'Accounts',   count: stats?.totalAccounts },
    { key: 'extensions', label: 'Extensions', count: stats?.totalExtensions },
    { key: 'users',      label: 'Users',      count: stats?.totalUsers },
    { key: 'calls',      label: 'Call Logs',  count: stats?.totalCalls },
    { key: 'costs',      label: 'Costs' },
    { key: 'leads',      label: 'Leads',      count: stats?.newLeads },
    { key: 'system',     label: 'System' },
  ]

  // Ã¢â€â‚¬Ã¢â€â‚¬ DASHBOARD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  return (
    <div className={`min-h-screen ${th.page} transition-colors duration-200`}>

      {/* HEADER */}
      <header className={`${th.header} border-b px-6 py-3 sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className={`text-base font-bold shrink-0 ${th.bodyText}`}>UnifyLine <span className={`text-xs font-normal ml-1 ${th.muted}`}>Admin</span></div>
          <div className={`flex gap-0.5 rounded-lg p-1 border ${th.tabBar}`}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => switchTab(t.key)}
                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium flex items-center gap-1.5 ${tab === t.key ? th.tabActive : th.tabInactive}`}>
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-black/10' : 'bg-gray-500/20 text-gray-400'}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xs px-2 py-1 rounded-md border font-medium text-emerald-400 bg-emerald-400/10 border-emerald-400/20">Ã¢â€”Â Super Admin</div>
            <button onClick={() => setDark(!d)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${th.btn}`}>{d ? 'Ã¢Ëœâ‚¬ Light' : 'Ã¢ËœÂ¾ Dark'}</button>
            <button onClick={() => setAuth({ type: 'none' })} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20 transition-colors">Sign Out</button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">

        {/* STATS */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Total Accounts', value: stats.totalAccounts,  color: '' },
              { label: 'Active',         value: stats.activeAccounts, color: 'text-emerald-400' },
              { label: 'Trial',          value: stats.trialAccounts,  color: 'text-amber-400' },
              { label: 'Extensions',     value: stats.totalExtensions,color: '' },
              { label: 'Users',          value: stats.totalUsers,     color: 'text-blue-400' },
              { label: 'Call Records',   value: stats.totalCalls,     color: '' },
              { label: 'New Leads',      value: stats.newLeads,       color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className={`${th.surface} border rounded-xl p-4`}>
                <div className={`text-2xl font-bold ${s.color || th.bodyText}`}>{s.value}</div>
                <div className={`text-xs mt-1 ${th.muted}`}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="flex items-center justify-center h-48"><div className={`w-6 h-6 border-2 border-current opacity-20 border-t-current rounded-full animate-spin ${th.muted}`} /></div>}

        {actionMessage && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
            {actionMessage}<button onClick={() => setActionMessage('')} className="ml-4 opacity-60 hover:opacity-100">Ã¢Å“â€¢</button>
          </div>
        )}

        {/* TOOLBAR */}
        {!loading && (tab === 'accounts' || tab === 'extensions' || tab === 'calls' || tab === 'costs' || tab === 'users' || tab === 'leads') && (
          <div className="flex gap-3 mb-5 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}Ã¢â‚¬Â¦`}
              className={`flex-1 min-w-[200px] px-4 py-2 rounded-xl border text-sm outline-none transition-colors ${th.input}`} />
            {tab === 'accounts' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="all">All Status</option><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option>
              </select>
            )}
            {(tab === 'extensions' || tab === 'calls') && (
              <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="all">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            {tab === 'accounts'   && <button onClick={() => { setModalType('new_account');   setActionError('') }} className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium whitespace-nowrap">+ New Account</button>}
            {tab === 'extensions' && <button onClick={() => { setModalType('new_extension'); setActionError('') }} className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium whitespace-nowrap">+ New Extension</button>}
            {tab === 'users'      && <button onClick={() => { setModalType('invite_user');   setActionError('') }} className="px-4 py-2 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium whitespace-nowrap">+ Invite User</button>}
          </div>
        )}

        {/* Ã¢â€¢ÂÃ¢â€¢Â ACCOUNTS Ã¢â€¢ÂÃ¢â€¢Â */}
        {tab === 'accounts' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                {['Account','Slug','SIP Domain','Exts','Users','Status','Created','Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredAccounts.map(a => (
                  <tr key={a.id} className={`border-b ${th.row} transition-colors`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-6 h-6 rounded-md shrink-0" style={{ background: a.brand_primary_color || '#0C2C68' }} /><span className={`font-medium ${th.bodyText}`}>{a.name}</span></div></td>
                    <td className="px-4 py-3"><span className={`font-mono text-xs ${th.monoText}`}>{a.slug}</span></td>
                    <td className="px-4 py-3"><span className={`font-mono text-xs ${th.monoText}`}>{a.sip_domain}</span></td>
                    <td className={`px-4 py-3 text-sm font-medium ${th.bodyText}`}>{a._extCount ?? 0}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${th.bodyText}`}>{a._userCount ?? 0}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc(a.status)}`}>{a.status}</span></td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="flex gap-2">
                      <button onClick={() => handleToggleAccount(a)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${a.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-400/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-400/20'}`}>{a.status === 'active' ? 'Suspend' : 'Activate'}</button>
                      <button onClick={() => { setFilterAccount(a.id); switchTab('extensions') }} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${th.btn}`}>Exts Ã¢â€ â€™</button>
                    </div></td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 && <tr><td colSpan={8} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No accounts found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Ã¢â€¢ÂÃ¢â€¢Â EXTENSIONS Ã¢â€¢ÂÃ¢â€¢Â */}
        {tab === 'extensions' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                {['Ext.','Name','Account','SIP Password','Assigned To','Status','Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredExtensions.map(ext => {
                  const assignedUser = authUsers.find(u => u.extension === ext.extension_number && u.account_id === ext.account_id)
                  return (
                    <tr key={ext.id} className={`border-b ${th.row} transition-colors`}>
                      <td className="px-4 py-3 font-mono font-bold text-[#4f6ef7]">{ext.extension_number}</td>
                      <td className={`px-4 py-3 font-medium ${th.bodyText}`}>{ext.display_name || 'Ã¢â‚¬â€'}</td>
                      <td className={`px-4 py-3 text-xs ${th.subText}`}>{ext.account_name || 'Ã¢â‚¬â€'}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{ext.sip_password}</td>
                      <td className={`px-4 py-3 text-xs ${assignedUser ? 'text-emerald-400' : th.subText}`}>{assignedUser ? assignedUser.email : <span className="italic">Unassigned</span>}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ext.active ? sc('active') : sc('suspended')}`}>{ext.active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-3"><div className="flex gap-2">
                        <button onClick={() => handleToggleExtension(ext)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ext.active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-400/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-400/20'}`}>{ext.active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => handleDeleteExtension(ext)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400/60 hover:bg-red-500/15 hover:text-red-400 border border-red-400/10 transition-colors">Delete</button>
                      </div></td>
                    </tr>
                  )
                })}
                {filteredExtensions.length === 0 && <tr><td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No extensions found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Ã¢â€¢ÂÃ¢â€¢Â USERS Ã¢â€¢ÂÃ¢â€¢Â */}
        {tab === 'users' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                {['Email','Account','Extension','Role','Last Sign In','Status','Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`border-b ${th.row} transition-colors`}>
                    <td className="px-4 py-3">
                      <div className={`font-medium text-sm ${th.bodyText}`}>{u.email}</div>
                      <div className={`font-mono text-xs ${th.subText}`}>{u.id.slice(0,8)}Ã¢â‚¬Â¦</div>
                    </td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{u.account_name || <span className="italic text-amber-400">Not linked</span>}</td>
                    <td className="px-4 py-3">{u.extension ? <span className="font-mono font-bold text-[#4f6ef7]">{u.extension}{u.display_name ? ` Ã‚Â· ${u.display_name}` : ''}</span> : <span className={`italic text-xs ${th.subText}`}>None</span>}</td>
                    <td className="px-4 py-3">{u.role ? <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.role === 'admin' ? 'text-purple-400 bg-purple-400/10 border-purple-400/30' : sc('active')}`}>{u.role}</span> : 'Ã¢â‚¬â€'}</td>
                    <td className={`px-4 py-3 text-xs ${th.subText}`}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.linked ? sc('active') : 'text-amber-400 bg-amber-400/10 border-amber-400/30'}`}>{u.linked ? 'Linked' : 'Unlinked'}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-2">
                      <button onClick={() => { setSelectedUser(u); setAssignForm({ account_id: u.account_id || '', extension_id: '', role: u.role || 'user' }); setModalType('assign_user'); setActionError('') }} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${th.btn}`}>{u.linked ? 'Reassign' : 'Assign'}</button>
                      {u.linked && <button onClick={() => handleUnlinkUser(u)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-400/20 transition-colors">Unlink</button>}
                    </div></td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Ã¢â€¢ÂÃ¢â€¢Â CALL LOGS Ã¢â€¢ÂÃ¢â€¢Â */}
        {tab === 'calls' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                {['From','To','Account','Direction','Duration','AI Summary','Date'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredCalls.map(call => {
                  const acctName = accounts.find(a => a.id === call.account_id)?.name
                  const isExp = expandedCall === call.id
                  return (
                    <>
                      <tr key={call.id} className={`border-b ${th.row} transition-colors cursor-pointer`} onClick={() => setExpandedCall(isExp ? null : call.id)}>
                        <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.from_number}</td>
                        <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.to_number || 'Ã¢â‚¬â€'}</td>
                        <td className={`px-4 py-3 text-xs ${th.subText}`}>{acctName || 'Ã¢â‚¬â€'}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${call.direction === 'inbound' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-blue-400 bg-blue-400/10 border-blue-400/30'}`}>{call.direction}</span></td>
                        <td className={`px-4 py-3 text-xs ${th.subText}`}>{fmt(call.duration_sec)}</td>
                        <td className={`px-4 py-3 text-xs ${th.subText} max-w-xs`}><div className="flex items-start gap-2"><span className={isExp ? '' : 'truncate max-w-[240px] block'}>{call.ai_summary || 'Ã¢â‚¬â€'}</span>{call.ai_summary && <span className={`shrink-0 text-xs ${th.muted}`}>{isExp ? 'Ã¢â€“Â²' : 'Ã¢â€“Â¼'}</span>}</div></td>
                        <td className={`px-4 py-3 text-xs ${th.subText} whitespace-nowrap`}>{new Date(call.created_at).toLocaleString()}</td>
                      </tr>
                      {isExp && call.ai_summary && (
                        <tr key={call.id+'-exp'} className={`border-b ${d ? 'bg-[#22263a]' : 'bg-blue-50'}`}>
                          <td colSpan={7} className="px-6 py-4">
                            <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${th.muted}`}>Full AI Summary</div>
                            <div className={`text-sm leading-relaxed ${th.bodyText}`}>{call.ai_summary}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {filteredCalls.length === 0 && <tr><td colSpan={7} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No call records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* COSTS TAB */}
        {tab === 'costs' && !loading && (() => {
          const callsWithCost = calls.filter(c => c.estimated_cost_usd != null)
          const totalCost = callsWithCost.reduce((sum, c) => sum + (c.estimated_cost_usd || 0), 0)
          const transferredCount = callsWithCost.filter(c => c.was_transferred).length
          const avgCost = callsWithCost.length > 0 ? totalCost / callsWithCost.length : 0

          const byAccount: Record<string, { name: string; cost: number; count: number }> = {}
          callsWithCost.forEach(c => {
            const acctName = accounts.find(a => a.id === c.account_id)?.name || 'Unknown'
            if (!byAccount[c.account_id]) byAccount[c.account_id] = { name: acctName, cost: 0, count: 0 }
            byAccount[c.account_id].cost += c.estimated_cost_usd || 0
            byAccount[c.account_id].count += 1
          })
          const accountRows = Object.values(byAccount).sort((a, b) => b.cost - a.cost)

          const topCalls = [...callsWithCost].sort((a, b) => (b.estimated_cost_usd || 0) - (a.estimated_cost_usd || 0)).slice(0, 10)

          return (
            <div className="space-y-6">
              <div className={`px-4 py-2 rounded-lg text-xs ${th.muted} border ${th.rowDivider}`}>
                Estimates only - approximate telephony + AI processing cost, based on the most recent {calls.length} call records loaded. Not billing-grade; verify against actual Twilio/Deepgram/Anthropic dashboards.
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Estimated Cost', value: `$${totalCost.toFixed(2)}`, color: 'text-emerald-400' },
                  { label: 'Calls With Cost Data', value: callsWithCost.length, color: '' },
                  { label: 'Live Transfers', value: transferredCount, color: 'text-blue-400' },
                  { label: 'Avg Cost / Call', value: `$${avgCost.toFixed(4)}`, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className={`${th.surface} border rounded-xl p-4`}>
                    <div className={`text-2xl font-bold ${s.color || th.bodyText}`}>{s.value}</div>
                    <div className={`text-xs mt-1 ${th.muted}`}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${th.muted}`}>Cost by Account</div>
                <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
                  <table className="w-full text-sm">
                    <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                      {['Account', 'Calls', 'Total Cost', 'Avg Cost/Call'].map(h => (
                        <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {accountRows.map(row => (
                        <tr key={row.name} className={`border-b ${th.row} transition-colors`}>
                          <td className={`px-4 py-3 text-sm ${th.bodyText}`}>{row.name}</td>
                          <td className={`px-4 py-3 text-xs ${th.subText}`}>{row.count}</td>
                          <td className={`px-4 py-3 text-sm font-semibold text-emerald-400`}>${row.cost.toFixed(4)}</td>
                          <td className={`px-4 py-3 text-xs ${th.subText}`}>${(row.cost / row.count).toFixed(4)}</td>
                        </tr>
                      ))}
                      {accountRows.length === 0 && <tr><td colSpan={4} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No cost data yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${th.muted}`}>Most Expensive Calls</div>
                <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
                  <table className="w-full text-sm">
                    <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                      {['From', 'Account', 'Duration', 'Transferred', 'Cost', 'Date'].map(h => (
                        <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {topCalls.map(call => {
                        const acctName = accounts.find(a => a.id === call.account_id)?.name
                        const realDuration = call.actual_duration_sec ?? call.duration_sec
                        return (
                          <tr key={call.id} className={`border-b ${th.row} transition-colors`}>
                            <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{call.from_number}</td>
                            <td className={`px-4 py-3 text-xs ${th.subText}`}>{acctName || 'Unknown'}</td>
                            <td className={`px-4 py-3 text-xs ${th.subText}`}>{fmt(realDuration)}</td>
                            <td className="px-4 py-3">
                              {call.was_transferred
                                ? <span className="text-xs px-2 py-0.5 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/30">transferred</span>
                                : <span className={`text-xs ${th.muted}`}>-</span>}
                            </td>
                            <td className={`px-4 py-3 text-sm font-semibold text-emerald-400`}>${(call.estimated_cost_usd || 0).toFixed(4)}</td>
                            <td className={`px-4 py-3 text-xs ${th.subText} whitespace-nowrap`}>{new Date(call.created_at).toLocaleString()}</td>
                          </tr>
                        )
                      })}
                      {topCalls.length === 0 && <tr><td colSpan={6} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No cost data yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Ã¢â€¢ÂÃ¢â€¢Â LEADS Ã¢â€¢ÂÃ¢â€¢Â */}
        {tab === 'leads' && !loading && (
          <div className={`${th.surface} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-sm">
              <thead><tr className={`${th.surface2} border-b ${th.rowDivider}`}>
                {['Business', 'Contact', 'Email', 'Phone', 'Industry', 'Status', 'Submitted', ''].map(h => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${th.muted}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const isExp = expandedLead === lead.id
                  const statusColors: Record<string, string> = {
                    new: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
                    contacted: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
                    converted: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
                    closed: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
                  }
                  return (
                    <>
                      <tr key={lead.id} className={`border-b ${th.row} transition-colors cursor-pointer`} onClick={() => setExpandedLead(isExp ? null : lead.id)}>
                        <td className={`px-4 py-3 font-medium ${th.bodyText}`}>{lead.business_name}</td>
                        <td className={`px-4 py-3 text-xs ${th.subText}`}>{lead.contact_name}</td>
                        <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{lead.email}</td>
                        <td className={`px-4 py-3 font-mono text-xs ${th.monoText}`}>{lead.phone || 'Ã¢â‚¬â€'}</td>
                        <td className={`px-4 py-3 text-xs ${th.subText}`}>{lead.industry || 'Ã¢â‚¬â€'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={lead.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateLeadStatus(lead, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border outline-none cursor-pointer ${statusColors[lead.status] || statusColors.new}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                        <td className={`px-4 py-3 text-xs ${th.subText} whitespace-nowrap`}>{new Date(lead.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleDeleteLead(lead)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={lead.id+'-exp'} className={`border-b ${d ? 'bg-[#22263a]' : 'bg-blue-50'}`}>
                          <td colSpan={8} className="px-6 py-4">
                            <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${th.muted}`}>Message</div>
                            <div className={`text-sm leading-relaxed ${th.bodyText}`}>{lead.message || 'No message provided.'}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {filteredLeads.length === 0 && <tr><td colSpan={8} className={`px-4 py-14 text-center text-sm ${th.emptyText}`}>No leads yet Ã¢â‚¬â€ submissions from /get-started will appear here</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Ã¢â€¢ÂÃ¢â€¢Â SYSTEM Ã¢â€¢ÂÃ¢â€¢Â */}
        {tab === 'system' && !loading && (
          <div className="space-y-4">
            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>Your Privileges Ã¢â‚¬â€ Super Admin</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Create & manage accounts','Suspend / activate accounts','Create extensions','Enable / disable / delete extensions','Invite users & assign extensions','View all call logs across tenants','Reset user passwords','Filter by account / tenant','Full system overview'].map(p => (
                  <div key={p} className={`${th.surface2} rounded-xl p-3 border ${th.rowDivider}`}><div className="text-xs font-semibold text-emerald-400">Ã¢Å“â€œ {p}</div></div>
                ))}
              </div>
              <div className={`mt-4 pt-4 border-t ${th.rowDivider} text-xs ${th.subText}`}><strong className={th.muted}>Roadmap:</strong> Multi-admin with Viewer/Support/Manager roles Ã‚Â· Audit log Ã‚Â· Per-admin email login</div>
            </div>
            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>Infrastructure</h3>
              <div className="space-y-0">
                {[{l:'FreeSWITCH Server',v:'198.58.114.103'},{l:'WebSocket (WSS)',v:'wss://198.58.114.103:7443'},{l:'TURN Server',v:'198.58.114.103:3478'},{l:'AI Receptionist',v:'n8n + Claude API'},{l:'Supabase',v:'unifyline project'}].map((item,i,arr) => (
                  <div key={item.l} className={`flex items-center justify-between py-3 text-sm ${i < arr.length-1 ? `border-b ${th.rowDivider}` : ''}`}>
                    <span className={th.subText}>{item.l}</span>
                    <div className="flex items-center gap-3"><span className={`font-mono text-xs ${th.monoText}`}>{item.v}</span><span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/30">online</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${th.surface} border rounded-2xl p-6`}>
              <h3 className={`font-semibold mb-4 ${th.sectionHead}`}>SIP Domains</h3>
              <div className="space-y-0 text-sm">
                {accounts.map((a,i,arr) => (
                  <div key={a.id} className={`flex items-center justify-between py-3 ${i < arr.length-1 ? `border-b ${th.rowDivider}` : ''}`}>
                    <div className="flex items-center gap-2.5"><div className="w-4 h-4 rounded" style={{ background: a.brand_primary_color || '#0C2C68' }} /><span className={`font-medium ${th.bodyText}`}>{a.name}</span></div>
                    <div className="flex items-center gap-3"><span className={`font-mono text-xs ${th.monoText}`}>{a.sip_domain}</span><span className={`text-xs px-2 py-0.5 rounded-full border ${sc(a.status)}`}>{a.status}</span></div>
                  </div>
                ))}
                {accounts.length === 0 && <p className={`py-4 text-sm ${th.emptyText}`}>No accounts configured</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ã¢â€¢ÂÃ¢â€¢Â MODAL: New Account Ã¢â€¢ÂÃ¢â€¢Â */}
      {modalType === 'new_account' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-5"><h3 className={`font-semibold text-base ${th.bodyText}`}>New Account</h3><button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>Ã¢Å“â€¢</button></div>
            <div className="space-y-3">
              {[{label:'Account Name',key:'name',ph:'e.g. MTI Premium Charters'},{label:'Slug',key:'slug',ph:'e.g. mti'},{label:'SIP Domain',key:'sip_domain',ph:'e.g. mti.unifyline.local'},{label:'Brand Color',key:'brand_primary_color',ph:'#0C2C68'}].map(f => (
                <div key={f.key}><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>{f.label}</label>
                <input value={(newAccount as any)[f.key]} onChange={e => setNewAccount({...newAccount,[f.key]:e.target.value})} placeholder={f.ph} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`} /></div>
              ))}
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Status</label>
              <select value={newAccount.status} onChange={e => setNewAccount({...newAccount,status:e.target.value})} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="trial">Trial</option><option value="active">Active</option>
              </select></div>
            </div>
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm ${th.btn}`}>Cancel</button>
              <button onClick={handleCreateAccount} disabled={actionLoading} className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium disabled:opacity-50">{actionLoading?'CreatingÃ¢â‚¬Â¦':'Create Account'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€¢ÂÃ¢â€¢Â MODAL: New Extension Ã¢â€¢ÂÃ¢â€¢Â */}
      {modalType === 'new_extension' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-5"><h3 className={`font-semibold text-base ${th.bodyText}`}>New Extension</h3><button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>Ã¢Å“â€¢</button></div>
            <div className="space-y-3">
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Account</label>
              <select value={newExtension.account_id} onChange={e => setNewExtension({...newExtension,account_id:e.target.value})} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="">Select accountÃ¢â‚¬Â¦</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
              {[{label:'Extension Number',key:'extension_number',ph:'e.g. 203'},{label:'Display Name',key:'display_name',ph:'e.g. John Smith'},{label:'SIP Password',key:'sip_password',ph:'e.g. MTI203secure!'},{label:'Email (optional)',key:'email',ph:'john@company.com'}].map(f => (
                <div key={f.key}><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>{f.label}</label>
                <input value={(newExtension as any)[f.key]} onChange={e => setNewExtension({...newExtension,[f.key]:e.target.value})} placeholder={f.ph} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`} /></div>
              ))}
            </div>
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm ${th.btn}`}>Cancel</button>
              <button onClick={handleCreateExtension} disabled={actionLoading} className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium disabled:opacity-50">{actionLoading?'CreatingÃ¢â‚¬Â¦':'Create Extension'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€¢ÂÃ¢â€¢Â MODAL: Invite User Ã¢â€¢ÂÃ¢â€¢Â */}
      {modalType === 'invite_user' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-2"><h3 className={`font-semibold text-base ${th.bodyText}`}>Invite User</h3><button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>Ã¢Å“â€¢</button></div>
            <p className={`text-xs mb-4 ${th.subText}`}>A magic link invite will be sent. Once they sign up, use the Assign button to link their extension.</p>
            <div className="space-y-3">
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Email Address</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@company.com" autoFocus className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`} /></div>
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Account</label>
              <select value={inviteAccount} onChange={e => setInviteAccount(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="">Select accountÃ¢â‚¬Â¦</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
            </div>
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm ${th.btn}`}>Cancel</button>
              <button onClick={handleInviteUser} disabled={actionLoading || !inviteEmail || !inviteAccount} className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium disabled:opacity-50">{actionLoading?'SendingÃ¢â‚¬Â¦':'Send Invite'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ã¢â€¢ÂÃ¢â€¢Â MODAL: Assign Extension Ã¢â€¢ÂÃ¢â€¢Â */}
      {modalType === 'assign_user' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${th.modal} border rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-2"><h3 className={`font-semibold text-base ${th.bodyText}`}>Assign Extension</h3><button onClick={closeModal} className={`text-xl leading-none ${th.muted}`}>Ã¢Å“â€¢</button></div>
            <div className={`text-xs mb-4 px-3 py-2 rounded-lg ${th.surface2} ${th.subText}`}>Assigning: <strong className={th.bodyText}>{selectedUser.email}</strong></div>
            <div className="space-y-3">
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Account</label>
              <select value={assignForm.account_id} onChange={e => setAssignForm({...assignForm,account_id:e.target.value,extension_id:''})} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="">Select accountÃ¢â‚¬Â¦</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></div>
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Extension</label>
              <select value={assignForm.extension_id} onChange={e => setAssignForm({...assignForm,extension_id:e.target.value})} disabled={!assignForm.account_id} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input} disabled:opacity-50`}>
                <option value="">Select extensionÃ¢â‚¬Â¦</option>
                {assignableExts.map(e => <option key={e.id} value={e.id}>{e.extension_number} Ã¢â‚¬â€ {e.display_name || 'unnamed'}{e.user_id ? ' (assigned)' : ''}</option>)}
              </select></div>
              <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${th.modalLabel}`}>Role</label>
              <select value={assignForm.role} onChange={e => setAssignForm({...assignForm,role:e.target.value})} className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${th.input}`}>
                <option value="user">User</option><option value="admin">Account Admin</option>
              </select></div>
            </div>
            {actionError && <div className="mt-3 text-sm text-red-400">{actionError}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl text-sm ${th.btn}`}>Cancel</button>
              <button onClick={handleAssignUser} disabled={actionLoading || !assignForm.account_id || !assignForm.extension_id} className="flex-1 py-2.5 bg-[#0C2C68] hover:bg-[#0a2255] text-white rounded-xl text-sm font-medium disabled:opacity-50">{actionLoading?'SavingÃ¢â‚¬Â¦':'Assign Extension'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
