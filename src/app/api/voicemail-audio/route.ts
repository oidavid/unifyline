import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const FS_API = 'http://198.58.114.103:8088'

// Proxies voicemail audio from FreeSWITCH server
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const filePath = req.nextUrl.searchParams.get('path')
    if (!filePath || !filePath.includes('voicemail')) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    // Fetch audio file from FreeSWITCH server
    const res = await fetch(
      `${FS_API}/api/file?path=${encodeURIComponent(filePath)}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) {
      return new NextResponse('Audio not found', { status: 404 })
    }

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e: any) {
    return new NextResponse('Error', { status: 500 })
  }
}
