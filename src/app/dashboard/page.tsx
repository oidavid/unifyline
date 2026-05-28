import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Phone, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: cdrs } = await supabase
    .from('call_detail_records')
    .select('*')
    .eq('account_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: totalCalls } = await supabase
    .from('call_detail_records')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', user.id)

  const { count: inboundCalls } = await supabase
    .from('call_detail_records')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', user.id)
    .eq('direction', 'inbound')

  const { count: outboundCalls } = await supabase
    .from('call_detail_records')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', user.id)
    .eq('direction', 'outbound')

  const stats = [
    { label: 'Total Calls', value: totalCalls || 0, icon: Phone, color: 'bg-blue-500' },
    { label: 'Inbound', value: inboundCalls || 0, icon: PhoneIncoming, color: 'bg-green-500' },
    { label: 'Outbound', value: outboundCalls || 0, icon: PhoneOutgoing, color: 'bg-purple-500' },
    { label: 'Avg Duration', value: '2:34', icon: Clock, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Welcome to UnifyLine — your AI communications platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
            <div className={${color} p-3 rounded-lg}>
              <Icon size={24} className="text-white" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Calls</h3>
        {cdrs && cdrs.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3">Direction</th>
                <th className="pb-3">From</th>
                <th className="pb-3">To</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cdrs.map(cdr => (
                <tr key={cdr.id} className="py-3">
                  <td className="py-3">
                    <span className={px-2 py-1 rounded-full text-xs font-medium }>
                      {cdr.direction}
                    </span>
                  </td>
                  <td className="py-3 text-gray-700">{cdr.from_number}</td>
                  <td className="py-3 text-gray-700">{cdr.to_number}</td>
                  <td className="py-3 text-gray-700">{cdr.duration_sec}s</td>
                  <td className="py-3 text-gray-500">
                    {new Date(cdr.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Phone size={48} className="mx-auto mb-3 opacity-30" />
            <p>No calls yet. Make your first call to see it here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
