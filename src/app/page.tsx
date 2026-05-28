import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function Home() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
    else redirect('/auth/login')
  } catch {
    redirect('/auth/login')
  }
}
