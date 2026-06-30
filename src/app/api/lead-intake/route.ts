import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { business_name, contact_name, email, phone, industry, message } = body

    if (!business_name || !contact_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save lead to Supabase
    const { error } = await admin.from('intake_leads').insert([{
      business_name, contact_name, email, phone, industry, message,
      status: 'new',
    }])

    if (error) {
      console.error('[lead-intake] DB error', error)
      // Continue anyway - still notify by email even if DB insert fails
    }

    // Notify internal team
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'UnifyLine Leads <briefing@unifyline.com>',
          to: process.env.LEAD_NOTIFICATION_EMAIL || 'osasdavid@gmail.com',
          subject: `New UnifyLine Lead: ${business_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#0C2C68">New Demo Request</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#6B7280;width:140px">Business</td><td style="padding:8px 0;font-weight:600">${business_name}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7280">Contact</td><td style="padding:8px 0">${contact_name}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7280">Email</td><td style="padding:8px 0">${email}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7280">Phone</td><td style="padding:8px 0">${phone || 'Not provided'}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7280">Industry</td><td style="padding:8px 0">${industry || 'Not specified'}</td></tr>
              </table>
              ${message ? `<div style="margin-top:16px;padding:16px;background:#F9FAFB;border-radius:8px"><p style="color:#374151;margin:0">${message}</p></div>` : ''}
            </div>
          `,
        })
      } catch (e) {
        console.error('[lead-intake] email failed', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[lead-intake]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
