import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { destination, callerId } = await req.json()

    const freeswitchHost = process.env.FREESWITCH_HOST
    const freeswitchPassword = process.env.FREESWITCH_PASSWORD

    const command = originate {origination_caller_id_number=}sofia/gateway/sysmaster/ &echo

    const response = await fetch(http://:8080/api/originate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, password: freeswitchPassword }),
    })

    await supabase.from('call_detail_records').insert({
      account_id: user.id,
      direction: 'outbound',
      from_number: callerId,
      to_number: destination,
      status: 'initiated',
    })

    return NextResponse.json({ success: true, destination })
  } catch (error) {
    return NextResponse.json({ error: 'Call failed' }, { status: 500 })
  }
}
