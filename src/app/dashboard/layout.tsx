'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Phone, LayoutDashboard, Users, LogOut, Mic, Video, CreditCard, GitBranch, Voicemail, PhoneCall, Hash, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Image from 'next/image'

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
  const [brand, setBrand] = useState({
    name: 'UnifyLine',
    primaryColor: '#0C2C68',
    logoUrl: '',
    dids: [] as string[],
  })

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profile } = await supabase.from('profiles').select('first_name, last_name, full_name').eq('id', user.id).single()
      const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
      const lastName = profile?.last_name || profile?.full_name?.split(' ')[1] || ''
      const ini = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U'
      setInitials(ini)
      setDisplayName(firstName + (lastName ? ' ' + lastName : ''))

      // Load account branding
      const { data: auData } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).single()
      if (auData?.account_id) {
        const { data: account } = await supabase.from('accounts').select('name, brand_primary_color, brand_logo_url').eq('id', auData.account_id).single()
        const { data: didsData } = await supabase.from('account_phone_numbers').select('did_number').eq('account_id', auData.account_id).limit(3)
        if (account) {
          setBrand({
            name: account.name || 'UnifyLine',
            primaryColor: account.brand_primary_color || '#0C2C68',
            logoUrl: account.brand_logo_url || '',
            dids: didsData?.map(d => d.did_number) || [],
          })
        }
      }
    }
    loadUser()
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const bg = brand.primaryColor
  const isLight = brand.primaryColor === '#F5F0E8'

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-10 object-contain" />
          ) : (
            <>
              <h1 className="text-xl font-bold text-white">{brand.name}</h1>
              <p className="text-white/50 text-xs mt-0.5">AI Communications</p>
            </>
          )}
        </div>
        <button onClick={() => setMenuOpen(false)} className="md:hidden text-white/50 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={active
                ? 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/20 text-white'
                : 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition'}>
              <Icon size={16} />{label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-white/50 text-xs font-medium mb-1">Active DIDs</p>
          {brand.dids.map(did => (
            <p key={did} className="text-white text-xs font-mono">
              {did.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
            </p>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
          <span className="flex-1 text-xs text-white/70 truncate">{displayName}</span>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition text-sm font-medium w-full">
          <LogOut size={16} />Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <style>{`
        :root { --brand: ${bg}; }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-56 text-white flex-col flex-shrink-0" style={{ backgroundColor: bg }}>
        <SidebarContent />
      </aside>

      {/* MOBILE SLIDE-OUT */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-72 text-white flex flex-col h-full shadow-2xl" style={{ backgroundColor: bg }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 text-white flex-shrink-0" style={{ backgroundColor: bg }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setMenuOpen(true)} className="p-1 text-white/70 hover:text-white">
              <Menu size={22} />
            </button>
            <span className="font-bold text-base">{brand.name}</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
          {bottomNavItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${active ? 'text-[var(--brand)]' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px]">{label}</span>
                {active && <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: bg }} />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}