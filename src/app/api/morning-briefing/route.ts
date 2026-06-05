import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get calls from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: calls } = await supabase
      .from('call_detail_records')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    const totalCalls = calls?.length || 0
    const hotLeads = calls?.filter(c => c.disposition === 'hot_lead' || c.ai_summary?.toLowerCase().includes('lead')) || []
    const missedCalls = calls?.filter(c => c.duration === 0 || c.disposition === 'missed') || []
    const answeredCalls = calls?.filter(c => (c.duration || 0) > 0) || []

    const callRows = calls?.slice(0, 10).map(c => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:8px">${c.caller_id_number || 'Unknown'}</td>
        <td style="padding:8px">${c.duration ? Math.round(c.duration / 60) + ' min' : 'Missed'}</td>
        <td style="padding:8px">${c.ai_summary ? c.ai_summary.substring(0, 80) + '...' : 'No summary'}</td>
        <td style="padding:8px">${new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding:8px;text-align:center">No calls in the last 24 hours</td></tr>'

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px">
        <div style="background:#0f2744;padding:20px;border-radius:8px;margin-bottom:24px">
          <h1 style="color:white;margin:0;font-size:24px">UnifyLine</h1>
          <p style="color:#94a3b8;margin:4px 0 0">Morning Briefing — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
          <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:32px;font-weight:700;color:#0f2744">${totalCalls}</div>
            <div style="color:#64748b;font-size:14px">Total Calls</div>
          </div>
          <div style="background:#fef3c7;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:32px;font-weight:700;color:#d97706">${hotLeads.length}</div>
            <div style="color:#64748b;font-size:14px">Hot Leads</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:32px;font-weight:700;color:#dc2626">${missedCalls.length}</div>
            <div style="color:#64748b;font-size:14px">Missed Calls</div>
          </div>
        </div>

        ${hotLeads.length > 0 ? `
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px">
          <h3 style="margin:0 0 12px;color:#d97706">🔥 Hot Leads Requiring Follow-up</h3>
          ${hotLeads.map(l => `<p style="margin:4px 0">• <strong>${l.caller_id_number}</strong>: ${l.ai_summary?.substring(0, 100) || 'No summary'}</p>`).join('')}
        </div>` : ''}

        <h3 style="color:#0f2744">Call Log (Last 24 Hours)</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px;text-align:left">Caller</th>
              <th style="padding:8px;text-align:left">Duration</th>
              <th style="padding:8px;text-align:left">AI Summary</th>
              <th style="padding:8px;text-align:left">Time</th>
            </tr>
          </thead>
          <tbody>${callRows}</tbody>
        </table>

        <div style="margin-top:24px;text-align:center">
          <a href="https://www.unifyline.com/dashboard" style="background:#0f2744;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600">View Full Dashboard</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;text-align:center">UnifyLine by IntelSys Technologies · unifyline.com</p>
      </div>
    `

    if (process.env.RESEND_API_KEY && process.env.ALERT_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'UnifyLine Briefing <briefing@unifyline.com>',
        to: process.env.ALERT_EMAIL!,
        subject: `📊 UnifyLine Morning Briefing — ${totalCalls} calls, ${hotLeads.length} leads`,
        html: emailHtml,
      })
    }

    return NextResponse.json({ success: true, totalCalls, hotLeads: hotLeads.length, missedCalls: missedCalls.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
