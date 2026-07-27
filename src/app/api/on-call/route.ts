import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAccountId() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: auData } = await admin
    .from('account_users').select('account_id').eq('user_id', user.id).single()
  return auData?.account_id || null
}

export async function GET() {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json([], { status: 401 })

  const { data, error } = await admin
    .from('on_call_schedule')
    .select('*')
    .eq('account_id', accountId)
    .order('department', { ascending: true, nullsFirst: true })
    .order('priority', { ascending: true })

  if (error) {
    console.error('[on-call GET]', error)
    return NextResponse.json([], { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, phone_number, label, department, priority, active } = body

    if (!phone_number) return NextResponse.json({ error: 'Missing phone_number' }, { status: 400 })

    const digits = String(phone_number).replace(/\D/g, '').replace(/^1/, '')
    if (digits.length !== 10) return NextResponse.json({ error: 'Phone number must be 10 digits' }, { status: 400 })
    const normalized = `+1${digits}`

    const row = {
      account_id: accountId,
      phone_number: normalized,
      label: label || null,
      department: department && department !== 'general' ? department : null,
      priority: priority ?? 1,
      active: active ?? true,
    }

    let error
    if (id) {
      const result = await admin.from('on_call_schedule').update(row).eq('id', id).eq('account_id', accountId)
      error = result.error
    } else {
      const result = await admin.from('on_call_schedule').insert(row)
      error = result.error
    }

    if (error) {
      console.error('[on-call POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[on-call POST]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const accountId = await getAccountId()
  if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await admin
      .from('on_call_schedule')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}