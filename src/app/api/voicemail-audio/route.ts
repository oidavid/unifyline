import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const VM_API = process.env.VOICEMAIL_API_URL || 'http://198.58.114.103:8088'
const VM_SECRET = process.env.VOICEMAIL_API_SECRET || ''

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const filePath = req.nextUrl.searchParams.get('path')
    if (!filePath) return new NextResponse('Missing path', { status: 400 })

    const res = await fetch(
      `${VM_API}/api/voicemail-audio?path=${encodeURIComponent(filePath)}`,
      { headers: { 'X-Internal-Auth': VM_SECRET }, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return new NextResponse('Audio not found', { status: 404 })

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' },
    })
  } catch (e: any) {
    return new NextResponse('Error', { status: 500 })
  }
}