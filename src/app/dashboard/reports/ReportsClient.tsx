'use client'
import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Phone, Users, Clock, TrendingUp, Calendar, Mic, Download, X } from 'lucide-react'

type CDR = {
  id: string
  from_number: string
  duration_sec: number
  ai_summary: string | null
  created_at: string
  direction: string
}

type Range = '7d' | '30d' | '90d' | 'all'
type Selection = { label: string; calls: CDR[] } | null

export default function ReportsClient({
  calls,
  primaryColor,
  accountName,
}: {
  calls: CDR[]
  primaryColor: string
  accountName: string
}) {
  const [range, setRange] = useState<Range>('30d')
  const [selection, setSelection] = useState<Selection>(null)
  const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)
  const accentColor = isDark ? '#C9A23F' : primaryColor

  const filteredCalls = useMemo(() => {
    if (range === 'all') return calls
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return calls.filter(c => new Date(c.created_at) >= cutoff)
  }, [calls, range])

  // ── Key metrics ──────────────────────────────────────────────
  const totalCalls = filteredCalls.length
  const uniqueCallers = new Set(filteredCalls.map((c: CDR) => c.from_number)).size
  const totalMinutes = Math.round(filteredCalls.reduce((sum: number, c: CDR) => sum + (c.duration_sec || 0), 0) / 60)
  const avgDuration = totalCalls > 0
    ? Math.round(filteredCalls.reduce((sum: number, c: CDR) => sum + (c.duration_sec || 0), 0) / totalCalls)
    : 0
  const callsWithSummary = filteredCalls.filter((c: CDR) => c.ai_summary).length
  const captureRate = totalCalls > 0 ? Math.round((callsWithSummary / totalCalls) * 100) : 0

  // ── Calls per day (line chart) ──────────────────────────────
  const callsByDay = useMemo(() => {
    const map = new Map<string, CDR[]>()
    filteredCalls.forEach((c: CDR) => {
      const day = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(c)
    })
    return Array.from(map.entries())
      .map(([date, dayCalls]) => ({ date, count: dayCalls.length }))
      .reverse()
      .slice(-30)
  }, [filteredCalls])

  function handleDateClick(dateLabel: string) {
    const matches = filteredCalls.filter((c: CDR) =>
      new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateLabel
    )
    setSelection({ label: `Calls on ${dateLabel}`, calls: matches })
  }

  // ── Peak hours (bar chart) ───────────────────────────────────
  const callsByHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: formatHour(i), count: 0 }))
    filteredCalls.forEach((c: CDR) => {
      const h = new Date(c.created_at).getHours()
      hours[h].count++
    })
    return hours
  }, [filteredCalls])

  function handleHourClick(hour: number, label: string) {
    const matches = filteredCalls.filter((c: CDR) => new Date(c.created_at).getHours() === hour)
    setSelection({ label: `Calls at ${label}`, calls: matches })
  }

  // ── Top callers ──────────────────────────────────────────────
  const topCallers = useMemo(() => {
    const map = new Map<string, number>()
    filteredCalls.forEach((c: CDR) => {
      if (c.from_number) map.set(c.from_number, (map.get(c.from_number) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredCalls])

  function handleCallerClick(number: string) {
    const matches = filteredCalls.filter((c: CDR) => c.from_number === number)
    setSelection({ label: `Calls from ${formatPhone(number)}`, calls: matches })
  }

  // ── Day of week distribution (pie) ───────────────────────────
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const callsByDayOfWeek = useMemo(() => {
    const counts = DAY_NAMES.map(d => ({ name: d, value: 0 }))
    filteredCalls.forEach((c: CDR) => {
      const d = new Date(c.created_at).getDay()
      counts[d].value++
    })
    return counts.filter(c => c.value > 0)
  }, [filteredCalls])

  function handleDayOfWeekClick(dayName: string) {
    const dayIndex = DAY_NAMES.indexOf(dayName)
    const matches = filteredCalls.filter((c: CDR) => new Date(c.created_at).getDay() === dayIndex)
    setSelection({ label: `Calls on ${dayName}days`, calls: matches })
  }

  const PIE_COLORS = isDark
    ? ['#E8C26A', '#C9A23F', '#A67C20', '#8B6914', '#6B5A2A', '#4A3D1A', '#2A241A']
    : ['#0C2C68', '#1A56C4', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']

  function formatHour(h: number) {
    if (h === 0) return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
  }

  function formatPhone(num: string) {
    const digits = (num || '').replace(/\D/g, '')
    if (digits.length === 11 && digits[0] === '1') {
      return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    }
    return num
  }

  function formatDuration(sec: number) {
    if (!sec) return '0:00'
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  function handlePrint() {
    window.print()
  }

  const metrics = [
    { label: 'Total Calls', value: totalCalls, icon: Phone, onClick: () => setSelection({ label: 'All Calls', calls: filteredCalls }) },
    { label: 'Unique Callers', value: uniqueCallers, icon: Users, onClick: null },
    { label: 'Total Minutes', value: totalMinutes, icon: Clock, onClick: null },
    { label: 'Avg Call Length', value: `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, '0')}`, icon: TrendingUp, onClick: null },
    { label: 'Lead Capture Rate', value: `${captureRate}%`, icon: Mic, onClick: () => setSelection({ label: 'Calls with AI Summary', calls: filteredCalls.filter(c => c.ai_summary) }) },
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto print:p-0">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3 print:mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-500 mt-1 text-sm">{accountName} — call activity insights</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => { setRange(r); setSelection(null) }}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition"
                style={range === r ? { background: accentColor, color: isDark ? '#0A0A0A' : '#FFFFFF' } : { color: '#6B7280' }}
              >
                {r === 'all' ? 'All time' : `Last ${r.replace('d', '')} days`}
              </button>
            ))}
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <Download size={13} />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{accountName} — Call Report</h1>
        <p className="text-sm text-gray-500">
          {range === 'all' ? 'All time' : `Last ${range.replace('d', ' days')}`} · Generated {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {metrics.map(({ label, value, icon: Icon, onClick }) => (
          <div
            key={label}
            onClick={onClick || undefined}
            className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 print:shadow-none print:border-gray-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200 transition' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} style={{ color: accentColor }} />
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {totalCalls === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No call data for this period</p>
          <p className="text-sm text-gray-400 mt-1">Try a wider date range</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Calls over time */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2 print:shadow-none print:border-gray-300 print:break-inside-avoid">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Call Volume Over Time</h3>
            <p className="text-xs text-gray-400 mb-3 print:hidden">Click a point to see that day's calls</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={callsByDay}
                onClick={(e: any) => { if (e && e.activeLabel) handleDateClick(e.activeLabel) }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke={accentColor} strokeWidth={2.5} dot={{ r: 4, cursor: 'pointer' }} activeDot={{ r: 6, cursor: 'pointer' }} name="Calls" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Peak hours */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 print:shadow-none print:border-gray-300 print:break-inside-avoid">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Peak Call Hours</h3>
            <p className="text-xs text-gray-400 mb-3 print:hidden">Click a bar to see calls in that hour</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={callsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9CA3AF" interval={2} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar
                  dataKey="count"
                  fill={accentColor}
                  radius={[4, 4, 0, 0]}
                  name="Calls"
                  cursor="pointer"
                  onClick={(data: any) => { if (data && data.count > 0) handleHourClick(data.hour, data.label) }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day of week distribution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 print:shadow-none print:border-gray-300 print:break-inside-avoid">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Calls by Day of Week</h3>
            <p className="text-xs text-gray-400 mb-3 print:hidden">Click a slice to see calls that day</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={callsByDayOfWeek}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  {callsByDayOfWeek.map((entry: any, i: number) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      cursor="pointer"
                      onClick={() => handleDayOfWeekClick(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top callers table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2 print:shadow-none print:border-gray-300 print:break-inside-avoid">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Most Frequent Callers</h3>
            <p className="text-xs text-gray-400 mb-3 print:hidden">Click a caller to see their calls</p>
            {topCallers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No repeat callers yet</p>
            ) : (
              <div className="space-y-2">
                {topCallers.map((caller: any, i: number) => (
                  <div
                    key={caller.number}
                    onClick={() => handleCallerClick(caller.number)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -m-1.5 transition print:hover:bg-transparent"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: accentColor }}
                    >
                      {i + 1}
                    </div>
                    <span className="font-mono text-sm text-gray-700 flex-1">{formatPhone(caller.number)}</span>
                    <span className="text-xs text-gray-400">{caller.count} call{caller.count !== 1 ? 's' : ''}</span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ background: accentColor, width: `${(caller.count / topCallers[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drill-down detail panel */}
      {selection && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mt-5 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{selection.label}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{selection.calls.length} call{selection.calls.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setSelection(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
              <X size={16} />
            </button>
          </div>
          {selection.calls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No calls match this selection</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Number</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Direction</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {selection.calls
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((c: CDR) => (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 px-2 text-xs text-gray-500 whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</td>
                        <td className="py-2 px-2 font-mono text-xs text-gray-700">{formatPhone(c.from_number)}</td>
                        <td className="py-2 px-2 text-xs text-gray-500">{formatDuration(c.duration_sec)}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {c.direction}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-xs text-gray-600 max-w-xs truncate">{c.ai_summary || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6 print:hidden">
        Use Print / Save PDF to share this report by email or in a meeting
      </p>
    </div>
  )
}