import React from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './layout-client'

async function getTenantBrand() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient(
      (process as any).env.NEXT_PUBLIC_SUPABASE_URL,
      (process as any).env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: auData } = await admin
      .from('account_users').select('account_id').eq('user_id', user.id).single()

    if (!auData?.account_id) return null

    const [{ data: account }, { data: didsData }, { data: profile }] = await Promise.all([
      admin.from('accounts').select('name, brand_primary_color, brand_logo_url').eq('id', auData.account_id).single(),
      admin.from('account_phone_numbers').select('did_number').eq('account_id', auData.account_id).limit(5),
      admin.from('profiles').select('first_name, last_name, full_name').eq('id', user.id).single(),
    ])

    const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'
    const lastName = profile?.last_name || profile?.full_name?.split(' ')[1] || ''
    const primaryColor = account?.brand_primary_color || '#0C2C68'
    const isDark = ['#1A1008', '#0A0A0A', '#1C1813', '#0F0C08'].includes(primaryColor)

    return {
      name: account?.name || 'UnifyLine',
      primaryColor,
      logoUrl: account?.brand_logo_url || '',
      dids: didsData?.map((d: any) => d.did_number) || [],
      initials: ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U',
      displayName: firstName + (lastName ? ' ' + lastName : ''),
      isDark,
      accountId: auData.account_id,
    }
  } catch {
    return null
  }
}

export default async function DashboardLayout({ children }: { children: import('react').ReactNode }) {
  const brand = await getTenantBrand()
  if (!brand) redirect('/auth/login')

  const bg = brand!.primaryColor
  const isDark = brand!.isDark
  const accent = isDark ? '#E8C26A' : '#FFFFFF'

  // CSS injected server-side — sidebar and layout colors are correct before first paint
  const themeCSS = `
    :root {
      --brand: ${bg};
      --brand-text: ${isDark ? '#F7F5F0' : '#FFFFFF'};
      --brand-muted: ${isDark ? '#B8AE96' : 'rgba(255,255,255,0.6)'};
      --brand-active: ${isDark ? 'rgba(232,194,106,0.2)' : 'rgba(255,255,255,0.2)'};
      --brand-hover: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'};
      --brand-accent: ${accent};
    }
    .sidebar-bg { background-color: ${bg} !important; }
  `

  // Inline script sets window.__BRAND before React hydrates any client component.
  // This is the only reliable way to pass server-known values to useState initializers.
  const brandScript = `window.__BRAND={color:"${bg}",isDark:${isDark},accent:"${accent}"}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <script dangerouslySetInnerHTML={{ __html: brandScript }} />
      <DashboardLayoutClient brand={brand!}>
        {children}
      </DashboardLayoutClient>
    </>
  )
}
