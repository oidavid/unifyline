'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Phone, LayoutDashboard, Users, LogOut, Mic, Video, CreditCard, GitBranch, Voicemail, PhoneCall, Hash, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/phone', icon: PhoneCall, label: 'Phone' },
  { href: '/dashboard/calls', icon: Phone, label: 'Call Logs' },
  { href: '/dashboard/ai-receptionist', icon: Mic, label: 'AI Receptionist' },
  { href: '/dashboard/extensions', icon: Hash, label: 'Extensions' },
  { href: '/dashboard/follow-me', icon: GitBranch, label: 'Follow-Me' },
  { href: '/dashboard/voicemail', icon: Voicemail, label: 'Voicemail' },
  { href: '/dashboard/conference', icon: Video, label: 'Conference' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
]

// Bottom nav shows the 5 most important items on mobile
const bottomNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/phone', icon: PhoneCall, label: 'Phone' },
  { href: '/dashboard/calls', icon: Phone, label: 'Calls' },
  { href: '/dashboard/ai-receptionist', icon: Mic, label: 'AI' },
  { href: '/dashboard/extensions', icon: Hash, label: 'Team' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [initials, setInitials] = useState('U')
  const [displayName, setDisplayName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('first_name, last_name, full_name').eq('id', user.id).single()
      const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
      const lastName = profile?.last_name || profile?.full_name?.split(' ')[1] || ''
      const ini = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U'
      setInitials(ini)
      setDisplayName(firstName + (lastName ? ' ' + lastName : ''))
    }
    loadUser()
  }, [])

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-blue-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">UnifyLine</h1>
          <p className="text-blue-300 text-xs mt-0.5">AI Communications</p>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setMenuOpen(false)} className="md:hidden text-blue-300 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={active
                ? 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium bg-white text-[#0C2C68]'
                : 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-800 transition'}>
              <Icon size={16} />{label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-blue-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-blue-300 text-xs font-medium mb-1">Active DIDs</p>
          <p className="text-white text-xs font-mono">404-592-5562</p>
          <p className="text-white text-xs font-mono">678-460-5180</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-white text-[#0C2C68] flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
          <span className="flex-1 text-xs text-blue-200 truncate">{displayName}</span>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-blue-800 transition text-sm font-medium w-full">
          <LogOut size={16} />Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden md:flex w-56 bg-[#0C2C68] text-white flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── MOBILE SLIDE-OUT MENU ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          {/* Drawer */}
          <aside className="relative w-72 bg-[#0C2C68] text-white flex flex-col h-full shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0C2C68] text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setMenuOpen(true)} className="p-1 text-blue-200 hover:text-white">
              <Menu size={22} />
            </button>
            <span className="font-bold text-base">UnifyLine</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-white text-[#0C2C68] flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
          {bottomNavItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${active ? 'text-[#0C2C68]' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px]">{label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-[#0C2C68] mt-0.5" />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
