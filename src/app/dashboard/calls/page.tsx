import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PhoneIncoming, PhoneOutgoing, Phone } from 'lucide-react'

export default async function CallLogsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: cdrs } = await supabase
    .from('call_detail_records')
    .select('*')
    .eq('account_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Call Logs</h2>
        <p className="text-gray-500 mt-1">Complete history of all calls through UnifyLine</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        {cdrs && cdrs.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b px-6">
                <th className="p-4">Direction</th>
                <th className="p-4">From</th>
                <th className="p-4">To</th>
                <th className="p-4">Duration</th>
                <th className="p-4">AI Summary</th>
                <th className="p-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cdrs.map(cdr => (
                <tr key={cdr.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {cdr.direction === 'inbound'
                        ? <PhoneIncoming size={16} className="text-green-500" />
                        : <PhoneOutgoing size={16} className="text-blue-500" />
                      }
                      <span className={px-2 py-1 rounded-full text-xs font-medium }>
                        {cdr.direction}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700 font-mono text-xs">{cdr.from_number}</td>
                  <td className="p-4 text-gray-700 font-mono text-xs">{cdr.to_number}</td>
                  <td className="p-4 text-gray-700">{cdr.duration_sec}s</td>
                  <td className="p-4 text-gray-500 max-w-xs truncate">
                    {cdr.ai_summary || <span className="text-gray-300">No summary</span>}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {new Date(cdr.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Phone size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No call records yet</p>
            <p className="text-sm mt-1">Calls will appear here automatically</p>
          </div>
        )}
      </div>
    </div>
  )
}
