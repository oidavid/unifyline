import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { account_id, caller_number, summary, alert_type = 'hot_lead' } = body

    if (!account_id || !summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: account } = await admin
      .from('accounts')
      .select('name, alert_email, alert_phone, brand_primary_color')
      .eq('id', account_id)
      .single()

    const alertEmail = (account as any)?.alert_email || process.env.ALERT_EMAIL
    const alertPhone = (account as any)?.alert_phone || process.env.ALERT_PHONE
    const accountName = (account as any)?.name || 'Your Business'
    const brandColor = (account as any)?.brand_primary_color || '#0C2C68'
    const isDark = ['#1A1008', '#0A0A0A', '#1C1813'].includes(brandColor)
    const headerColor = isDark ? '#C9A23F' : brandColor

    const isHotLead = alert_type === 'hot_lead'

    const digits = (caller_number || '').replace(/\D/g, '')
    const formatted = digits.length === 11 && digits[0] === '1'
      ? `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
      : digits.length === 10
      ? `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
      : caller_number

    const smsBody = isHotLead
      ? `NEW LEAD - ${accountName}\nFrom: ${formatted}\n${summary}\nView: unifyline.com/dashboard`
      : `Call Alert - ${accountName}\nFrom: ${formatted}\n${summary}`

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb">
        <div style="background:${headerColor};padding:20px 24px;border-radius:10px 10px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">${accountName}</h1>
          <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">Powered by UnifyLine AI</p>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
          ${isHotLead ? '<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:14px 18px;margin-bottom:20px"><strong style="color:#92400e;font-size:15px">Hot Lead - Call back within 5 minutes</strong></div>' : ''}
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Caller</td><td style="padding:8px 0;font-weight:600;color:#111827">${formatted}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Time</td><td style="padding:8px 0;color:#111827">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET</td></tr>
          </table>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0">${summary.replace(/\*\*/g, '').replace(/\n/g, '<br/>')}</p>
          </div>
          <a href="https://www.unifyline.com/dashboard" style="display:inline-block;background:${headerColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Full Call Log</a>
        </div>
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px">UnifyLine by IntelSys Technologies</p>
      </div>
    `

    const results: Record<string, string> = {}

    if (process.env.TWILIO_ACCOUNT_SID && alertPhone) {
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        const toNumber = alertPhone.startsWith('+') ? alertPhone : `+1${alertPhone.replace(/\D/g, '')}`
        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: toNumber,
        })
        results.sms = 'sent'
      } catch (e: any) {
        console.error('[alert SMS]', e.message)
        results.sms = `failed: ${e.message}`
      }
    }

    if (process.env.RESEND_API_KEY && alertEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'UnifyLine Alerts <alerts@unifyline.com>',
          to: alertEmail,
          subject: isHotLead
            ? `Hot Lead: ${formatted} called ${accountName}`
            : `Call Alert: ${formatted} called ${accountName}`,
          html: emailHtml,
        })
        results.email = 'sent'
      } catch (e: any) {
        console.error('[alert email]', e.message)
        results.email = `failed: ${e.message}`
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    console.error('[alerts POST]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}