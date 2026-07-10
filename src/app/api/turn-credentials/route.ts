import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Fetches a fresh Twilio Network Traversal Service (NTS) token.
// Returns normalized { iceServers: [{ urls, username, credential }], ttl }
export async function GET() {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN

    if (!sid || !token) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 })
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ Ttl: '86400' }),
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('[turn-credentials] Twilio error:', res.status, text)
      return NextResponse.json({ error: 'Failed to fetch TURN token from Twilio' }, { status: 502 })
    }

    const data = await res.json()

    const iceServers = (data.ice_servers || []).map((s: any) => ({
      urls: s.urls || s.url,
      username: s.username,
      credential: s.credential,
    }))

    return NextResponse.json({ iceServers, ttl: data.ttl })
  } catch (e: any) {
    console.error('[turn-credentials]', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}