import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/portal/mti/login', req.url))
  response.cookies.delete('mti_portal_session')
  return response
}
