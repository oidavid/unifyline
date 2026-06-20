import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Account {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

interface ModuleRow {
  account_id: string
  module_key: string
  enabled: boolean
}

interface PhoneRow {
  account_id: string
  did_number: string
  label: string
  routes_to_module: string
  routes_to_target: string | null
}

function formatPhoneNumber(num: string): string {
  const digits = num.replace(/\D/g, '').replace(/^1/, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return num
}

async function getAdminData() {
  const [accountsRes, modulesRes, phonesRes] = await Promise.all([
    supabase.from('accounts').select('id, name, slug, status, created_at').order('created_at', { ascending: true }),
    supabase.from('account_modules').select('account_id, module_key, enabled'),
    supabase.from('account_phone_numbers').select('account_id, did_number, label, routes_to_module, routes_to_target'),
  ])

  return {
    accounts: (accountsRes.data || []) as Account[],
    modules: (modulesRes.data || []) as ModuleRow[],
    phones: (phonesRes.data || []) as PhoneRow[],
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3FB984',
  trial: '#E0A93C',
  suspended: '#E05C5C',
  cancelled: '#6B7280',
}

export default async function AdminPage() {
  const { accounts, modules, phones } = await getAdminData()

  return (
    <div style={{ minHeight: '100vh', background: '#0B0E14', color: '#E4E7EC', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <header style={{
        background: '#13161F',
        borderBottom: '1px solid #262B38',
        padding: '24px 40px',
      }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>UnifyLine Admin</div>
        <div style={{ fontSize: '13px', color: '#7A8194', marginTop: '4px' }}>
          Accounts &middot; Modules &middot; Phone Numbers
        </div>
      </header>

      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ fontSize: '13px', color: '#7A8194', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
          {accounts.length} Account{accounts.length !== 1 ? 's' : ''}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {accounts.map((account) => {
            const accountModules = modules.filter(m => m.account_id === account.id)
            const accountPhones = phones.filter(p => p.account_id === account.id)
            const statusColor = STATUS_COLORS[account.status] || '#7A8194'

            return (
              <div
                key={account.id}
                style={{
                  background: '#13161F',
                  border: '1px solid #262B38',
                  borderRadius: '8px',
                  padding: '28px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '19px', fontWeight: 600, color: '#FFFFFF' }}>
                      {account.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#7A8194', marginTop: '2px' }}>
                      /{account.slug} &middot; created {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: statusColor,
                    border: `1px solid ${statusColor}`,
                    borderRadius: '20px',
                    padding: '4px 14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {account.status}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Modules */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#7A8194', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                      Modules
                    </div>
                    {accountModules.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#4A5163' }}>No modules enabled</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {accountModules.map((m) => (
                          <div key={m.module_key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <span style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: m.enabled ? '#3FB984' : '#4A5163',
                            }} />
                            <span style={{ color: m.enabled ? '#E4E7EC' : '#6B7280' }}>
                              {m.module_key.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DIDs */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#7A8194', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                      Phone Numbers
                    </div>
                    {accountPhones.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#4A5163' }}>No DIDs assigned</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {accountPhones.map((p) => (
                          <div key={p.did_number} style={{ fontSize: '13px' }}>
                            <span style={{ color: '#E4E7EC', fontFamily: 'monospace' }}>
                              {formatPhoneNumber(p.did_number)}
                            </span>
                            <span style={{ color: '#7A8194' }}> &middot; {p.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '32px', fontSize: '12px', color: '#4A5163', lineHeight: '1.6' }}>
          This is a read-only view of current account provisioning. To add a new account, module, or DID,
          run the appropriate SQL migration against the accounts / account_modules / account_phone_numbers tables.
          A form-based provisioning UI is planned for a future phase.
        </div>
      </main>
    </div>
  )
}
