import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      call_uuid,
      direction,
      caller_id_number,
      destination_number,
      duration,
      account_id,
    } = body

    await supabase.from('call_detail_records').upsert({
      call_uuid,
      account_id,
      direction: direction || 'outbound',
      from_number: caller_id_number,
      to_number: destination_number,
      duration_sec: parseInt(duration || '0'),
      status: 'completed',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
