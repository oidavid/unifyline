import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const rooms = {
    '9001': { name: 'Main Conference Room', participants: 0, active: false },
    '9002': { name: 'Sales Team Room', participants: 0, active: false },
    '9003': { name: 'Prayer Line', participants: 0, active: false },
  }
  return NextResponse.json({ rooms })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { room, action } = body
  return NextResponse.json({ success: true, room, action, message: `Conference room ${room} ${action}` })
}
