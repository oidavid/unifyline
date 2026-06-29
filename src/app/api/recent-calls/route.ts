import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([], { status: 401 })
    const accountId = req.nextUrl.searchParams.get('account_id')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '8')
    if (!accountId) return NextResponse.json([], { status: 400 })
    const { data, error } = await admin
      .from('call_detail_records')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return NextResponse.json([], { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json([], { status: 500 })
  }
}