import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Fetches fresh Twilio TURN credentials (valid 24h)
// Called by the phone page on mount so credentials never expire
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(null, { status: 401 })

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json(null, { status: 500 })
    }

    const credentials = btoa(`${accountSid}:${authToken}`)
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` },
      }
    )

    if (!res.ok) {
      console.error('[turn-credentials] Twilio error:', res.status)
      return NextResponse.json(null, { status: 500 })
    }

    const data = await res.json()
    
    // Return just the ice_servers array
    return NextResponse.json({
      iceServers: data.ice_servers,
      ttl: data.ttl,
    })
  } catch (e: any) {
    console.error('[turn-credentials]', e)
    return NextResponse.json(null, { status: 500 })
  }
}
