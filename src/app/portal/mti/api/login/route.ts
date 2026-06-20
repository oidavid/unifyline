import { NextRequest, NextResponse } from 'next/server'

// PLACEHOLDER: simple shared access code for now (Option 1 scope, as agreed
// before this build). Set MTI_PORTAL_PASSWORD in Vercel env vars. This is
// intentionally NOT real per-user auth - see the invite/account system
// notes in the build summary for the Option 3 upgrade path.
const PORTAL_PASSWORD = process.env.MTI_PORTAL_PASSWORD || 'PLACEHOLDER_SET_IN_VERCEL_ENV'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (password === PORTAL_PASSWORD) {
      const response = NextResponse.json({ success: true })
      // Simple session cookie, 7 day expiry. Not a JWT, not user-specific -
      // just proves "knows the shared access code." Upgrade path: replace
      // with a real Supabase Auth session once Option 3 is built.
      response.cookies.set('mti_portal_session', 'authenticated', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/portal/mti',
      })
      return response
    }

    return NextResponse.json({ success: false }, { status: 401 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
