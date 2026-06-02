'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Phone, LayoutDashboard, Users, LogOut, Mic, Video, CreditCard, GitBranch, Voicemail } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/calls', icon: Phone, label: 'Call Logs' },
  { href: '/dashboard/ai-receptionist', icon: Mic, label: 'AI Receptionist' },
  { href: '/dashboard/follow-me', icon: GitBranch, label: 'Follow-Me' },
  { href: '/dashboard/voicemail', icon: Voicemail, label: 'Voicemail' },
  { href: '/dashboard/conference', icon: Video, label: 'Conference' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-[#0C2C68] text-white flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-blue-800">
          <h1 className="text-xl font-bold">UnifyLine</h1>
          <p className="text-blue-300 text-xs mt-0.5">AI Communications</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={active
                  ? 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium bg-white text-[#0C2C68]'
                  : 'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-800 transition'
                }>
                <Icon size={16} />{label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-blue-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-blue-300 text-xs font-medium mb-1">Active DIDs</p>
            <p className="text-white text-xs font-mono">404-592-5562</p>
            <p className="text-white text-xs font-mono">678-460-5180</p>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-blue-800 transition text-sm font-medium w-full">
            <LogOut size={16} />Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
