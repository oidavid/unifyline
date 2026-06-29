'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Phone, LayoutDashboard, Users, LogOut, Mic, Video, GitBranch, Voicemail, PhoneCall, Hash, Menu, X, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'

type Brand = {
  name: string
  primaryColor: string
  logoUrl: string
  dids: string[]
  initials: string
  displayName: string
  isDark: boolean
  accountId: string
}

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
  { href: '/dashboard/account', icon: Settings, label: 'Account' },
]

const bottomNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/phone', icon: PhoneCall, label: 'Phone' },
  { href: '/dashboard/calls', icon: Phone, label: 'Calls' },
  { href: '/dashboard/ai-receptionist', icon: Mic, label: 'AI' },
  { href: '/dashboard/extensions', icon: Hash, label: 'Team' },
]

export default function DashboardLayoutClient({
  children,
  brand,
}: {
  children: import('react').ReactNode
  brand: Brand
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const bg = brand.primaryColor
  const textColor = brand.isDark ? '#F7F5F0' : '#FFFFFF'
  const mutedColor = brand.isDark ? '#B8AE96' : 'rgba(255,255,255,0.6)'
  const activeBg = brand.isDark ? 'rgba(232,194,106,0.2)' : 'rgba(255,255,255,0.2)'
  const hoverBg = brand.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'
  const accentColor = brand.isDark ? '#E8C26A' : '#FFFFFF'
  const borderColor = brand.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)'

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div>
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-10 object-contain" />
          ) : (
            <>
              <h1 className="text-xl font-bold" style={{ color: textColor }}>{brand.name}</h1>
              <p className="text-xs mt-0.5" style={{ color: mutedColor }}>AI Communications</p>
            </>
          )}
        </div>
        <button onClick={() => setMenuOpen(false)} className="md:hidden p-1" style={{ color: mutedColor }}>
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition"
              style={{
                background: active ? activeBg : 'transparent',
                color: active ? textColor : mutedColor,
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg }}
              onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: DIDs + user */}
      <div className="p-3" style={{ borderTop: `1px solid ${borderColor}` }}>
        {brand.dids.length > 0 && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium mb-1" style={{ color: mutedColor }}>Active DIDs</p>
            {brand.dids.map(did => (
              <p key={did} className="text-xs font-mono" style={{ color: textColor }}>
                {did.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
              </p>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: activeBg, color: accentColor }}
          >
            {brand.initials}
          </div>
          <span className="flex-1 text-xs truncate" style={{ color: mutedColor }}>{brand.displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition"
          style={{ color: mutedColor }}
          onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
          onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* DESKTOP SIDEBAR — uses sidebar-bg class set by server CSS, no flash */}
      <aside
        className="hidden md:flex w-56 text-white flex-col flex-shrink-0 sidebar-bg"
        style={{ backgroundColor: bg }}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE SLIDE-OUT */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside
            className="relative w-72 flex flex-col h-full shadow-2xl sidebar-bg"
            style={{ backgroundColor: bg }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0 sidebar-bg"
          style={{ backgroundColor: bg }}
        >
          <div className="flex items-center gap-2">
            <button onClick={() => setMenuOpen(true)} className="p-1" style={{ color: mutedColor }}>
              <Menu size={22} />
            </button>
            <span className="font-bold text-base" style={{ color: textColor }}>{brand.name}</span>
          </div>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: activeBg, color: accentColor }}
          >
            {brand.initials}
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
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors"
                style={{ color: active ? bg : '#9CA3AF' }}
              >
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
