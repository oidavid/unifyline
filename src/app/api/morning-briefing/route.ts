import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  return handler()
}

export async function POST(req: NextRequest) {
  return handler()
}

async function handler() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: calls } = await supabase
      .from('call_detail_records')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    const totalCalls = calls?.length || 0
    const hotLeads = calls?.filter(c =>
      c.ai_summary?.toLowerCase().includes('lead') ||
      c.ai_summary?.toLowerCase().includes('interest') ||
      c.ai_summary?.toLowerCase().includes('purchase') ||
      c.ai_summary?.toLowerCase().includes('book') ||
      c.disposition === 'hot_lead'
    ) || []
    const missedCalls = calls?.filter(c => !c.duration_sec || c.duration_sec < 5) || []
    const answeredCalls = calls?.filter(c => c.duration_sec && c.duration_sec >= 5) || []
    const avgDuration = answeredCalls.length > 0
      ? Math.round(answeredCalls.reduce((sum, c) => sum + (c.duration_sec || 0), 0) / answeredCalls.length)
      : 0

    // Build call rows for email table (max 15)
    const callRows = calls?.slice(0, 15).map(c => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 8px;font-size:13px">${c.caller_id_number || c.from_number || 'Unknown'}</td>
        <td style="padding:10px 8px;font-size:13px">${c.duration_sec ? (c.duration_sec < 60 ? c.duration_sec + 's' : Math.round(c.duration_sec / 60) + ' min') : '<span style="color:#dc2626">Missed</span>'}</td>
        <td style="padding:10px 8px;font-size:13px;color:#475569">${c.ai_summary ? c.ai_summary.substring(0, 100) + (c.ai_summary.length > 100 ? '...' : '') : 'No summary'}</td>
        <td style="padding:10px 8px;font-size:13px;color:#94a3b8;white-space:nowrap">${new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">No calls in the last 24 hours</td></tr>`

    // Hot leads section
    const hotLeadsHtml = hotLeads.length > 0 ? `
      <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:10px;padding:20px;margin-bottom:24px">
        <h3 style="margin:0 0 14px;color:#b45309;font-size:15px;font-weight:700">🔥 Hot Leads — Follow Up Today</h3>
        ${hotLeads.map((l: any) => `
          <div style="background:white;border-radius:8px;padding:12px 14px;margin-bottom:8px;border-left:3px solid #f59e0b">
            <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#0f2744">${l.caller_id_number || l.from_number || 'Unknown caller'}</p>
            <p style="margin:0;font-size:13px;color:#475569">${l.ai_summary?.substring(0, 150) || 'No summary available'}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#94a3b8">${new Date(l.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
        `).join('')}
      </div>
    ` : ''

    // Missed calls section
    const missedHtml = missedCalls.length > 0 ? `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:20px;margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#dc2626;font-size:15px;font-weight:700">📵 Missed Calls — ${missedCalls.length} need callbacks</h3>
        ${missedCalls.slice(0, 5).map((c: any) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #fee2e2">
            <span style="font-size:13px;font-weight:600;color:#0f2744">${c.caller_id_number || c.from_number || 'Unknown'}</span>
            <span style="font-size:12px;color:#94a3b8">${new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
        `).join('')}
        ${missedCalls.length > 5 ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8">+ ${missedCalls.length - 5} more. View all on the dashboard.</p>` : ''}
      </div>
    ` : ''

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:680px;margin:24px auto;padding:0 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f2744 0%,#1a4480 100%);padding:28px 32px;border-radius:12px 12px 0 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h1 style="color:white;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px">UnifyLine</h1>
          <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Morning Briefing · ${dateStr}</p>
        </div>
        <div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 16px;text-align:center">
          <p style="color:white;margin:0;font-size:24px;font-weight:700">${totalCalls}</p>
          <p style="color:#93c5fd;margin:2px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Total Calls</p>
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div style="background:white;padding:20px 32px;display:flex;gap:0;border-bottom:1px solid #e2e8f0">
      <div style="flex:1;text-align:center;padding:0 16px;border-right:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:700;color:#d97706">${hotLeads.length}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Hot Leads</p>
      </div>
      <div style="flex:1;text-align:center;padding:0 16px;border-right:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626">${missedCalls.length}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Missed Calls</p>
      </div>
      <div style="flex:1;text-align:center;padding:0 16px;border-right:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:700;color:#0f2744">${answeredCalls.length}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Answered</p>
      </div>
      <div style="flex:1;text-align:center;padding:0 16px">
        <p style="margin:0;font-size:28px;font-weight:700;color:#0f2744">${avgDuration}s</p>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Avg Duration</p>
      </div>
    </div>

    <!-- Main content -->
    <div style="background:white;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">

      ${hotLeadsHtml}
      ${missedHtml}

      <!-- Call log table -->
      <h3 style="margin:0 0 16px;color:#0f2744;font-size:15px;font-weight:700">Call Log — Last 24 Hours</h3>
      <div style="overflow:hidden;border-radius:8px;border:1px solid #e2e8f0">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Caller</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Duration</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">AI Summary</th>
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Time</th>
            </tr>
          </thead>
          <tbody>${callRows}</tbody>
        </table>
      </div>

      <!-- CTA -->
      <div style="margin-top:28px;text-align:center">
        <a href="https://www.unifyline.com/dashboard"
          style="display:inline-block;background:#0f2744;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.2px">
          View Full Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">
      UnifyLine by IntelSys Technologies · <a href="https://www.unifyline.com" style="color:#94a3b8">unifyline.com</a>
    </p>
  </div>
</body>
</html>
    `

    if (process.env.RESEND_API_KEY && process.env.ALERT_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'UnifyLine Briefing <briefing@unifyline.com>',
        to: process.env.ALERT_EMAIL!,
        subject: `UnifyLine Morning Briefing · ${totalCalls} calls, ${hotLeads.length} leads · ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        html: emailHtml,
      })
    }

    return NextResponse.json({
      success: true,
      totalCalls,
      hotLeads: hotLeads.length,
      missedCalls: missedCalls.length,
      answeredCalls: answeredCalls.length,
      avgDuration,
    })
  } catch (e: any) {
    console.error('[morning-briefing] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
