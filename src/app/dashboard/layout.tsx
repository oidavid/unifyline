'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Phone, LayoutDashboard, Users, LogOut, Mic } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/calls', icon: Phone, label: 'Call Logs' },
  { href: '/dashboard/ai-receptionist', icon: Mic, label: 'AI Receptionist' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
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
      <aside className="w-64 bg-[#0C2C68] text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-2xl font-bold">UnifyLine</h1>
          <p className="text-blue-300 text-xs mt-1">AI Communications Platform</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-white text-[#0C2C68]' : 'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-800'}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-blue-800">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 transition text-sm font-medium w-full">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
