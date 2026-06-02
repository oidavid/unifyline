import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { account_id, caller_number, summary, alert_type = 'hot_lead' } = body
    const msg = alert_type === 'hot_lead'
      ? `HOT LEAD - UnifyLine\nFrom: ${caller_number}\n${summary}\nDashboard: www.unifyline.com/dashboard`
      : `New message - UnifyLine\nFrom: ${caller_number}\n${summary}`
    await supabase.from('usage_events').insert({ account_id, event_type: 'alert_sent', metadata: JSON.stringify({ alert_type, caller_number, summary, message: msg }) })
    return NextResponse.json({ success: true, message: msg })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
