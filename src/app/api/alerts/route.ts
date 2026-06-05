import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { Resend } from 'resend'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { account_id, caller_number, summary, alert_type = 'hot_lead' } = body

    const isHotLead = alert_type === 'hot_lead'
    const smsMsg = isHotLead
      ? `HOT LEAD - UnifyLine\nFrom: ${caller_number}\n${summary}\nDashboard: www.unifyline.com/dashboard\nReply STOP to opt out.`
      : `UnifyLine Alert\nFrom: ${caller_number}\n${summary}\nReply STOP to opt out.`

    const emailSubject = isHotLead ? `🔥 Hot Lead Alert - ${caller_number}` : `UnifyLine Alert - ${caller_number}`
    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#0f2744;padding:20px;border-radius:8px;margin-bottom:24px">
          <h1 style="color:white;margin:0;font-size:24px">UnifyLine</h1>
          <p style="color:#94a3b8;margin:4px 0 0">Communications. Intelligent. Borderless.</p>
        </div>
        ${isHotLead ? '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:20px"><strong>🔥 HOT LEAD ALERT</strong></div>' : ''}
        <h2 style="color:#0f2744">New Call Alert</h2>
        <p><strong>From:</strong> ${caller_number}</p>
        <p><strong>Summary:</strong><br/>${summary}</p>
        <div style="margin-top:24px">
          <a href="https://www.unifyline.com/dashboard" style="background:#0f2744;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">View Dashboard</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">UnifyLine by IntelSys Technologies</p>
      </div>
    `

    // Send SMS via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.ALERT_PHONE) {
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await twilioClient.messages.create({
          body: smsMsg,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: process.env.ALERT_PHONE!,
        })
      } catch (smsErr: any) {
        console.error('SMS error:', smsErr.message)
      }
    }

    // Send email via Resend
    if (process.env.RESEND_API_KEY && process.env.ALERT_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'UnifyLine Alerts <alerts@unifyline.com>',
          to: process.env.ALERT_EMAIL!,
          subject: emailSubject,
          html: emailHtml,
        })
      } catch (emailErr: any) {
        console.error('Email error:', emailErr.message)
      }
    }

    // Log to Supabase
    await supabase.from('usage_events').insert({
      account_id,
      event_type: 'alert_sent',
      metadata: JSON.stringify({ alert_type, caller_number, summary })
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
