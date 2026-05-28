import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { destination, callerId } = await req.json()

    await supabase.from('call_detail_records').insert({
      account_id: user.id,
      direction: 'outbound',
      from_number: callerId,
      to_number: destination,
      status: 'initiated',
    })

    return NextResponse.json({ success: true, destination, message: 'Call logged. Connect via Zoiper to complete.' })
  } catch (error) {
    return NextResponse.json({ error: 'Call failed' }, { status: 500 })
  }
}
