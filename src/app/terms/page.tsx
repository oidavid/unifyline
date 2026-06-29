export default function TermsPage() {
  const sections = [
    { title: '1. Service Description', content: 'UnifyLine provides AI-powered business communications services including an AI receptionist, call management, team softphone, and business intelligence tools for small and medium businesses.' },
    { title: '2. Account Registration', content: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. By providing your phone number, you consent to receive transactional SMS notifications from UnifyLine.' },
    { title: '3. SMS Terms', content: 'UnifyLine sends transactional SMS messages to opted-in account holders including hot lead alerts and daily briefing summaries. Message frequency varies based on call volume. Message and data rates may apply. Reply STOP to unsubscribe. Reply HELP for assistance. For support contact support@unifyline.com.' },
    { title: '4. Acceptable Use', content: 'You agree to use UnifyLine only for lawful business purposes. You may not use our services to harass, spam, or communicate with individuals who have not consented to receive communications.' },
    { title: '5. Payment', content: 'Subscription fees are billed monthly. All fees are non-refundable except as required by law. We reserve the right to modify pricing with 30 days notice.' },
    { title: '6. Limitation of Liability', content: 'UnifyLine is provided "as is." To the maximum extent permitted by law, IntelSys Technologies shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.' },
    { title: '7. Contact', content: 'For questions about these terms, contact us at support@unifyline.com | IntelSys Technologies | Atlanta, GA' },
  ]
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '48px 24px', color: '#111827' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Terms of Service</h1>
      <p style={{ color: '#6B7280', marginBottom: '32px' }}>Last updated: June 29, 2026</p>
      <p style={{ marginBottom: '24px', lineHeight: '1.7', color: '#374151' }}>These Terms of Service govern your use of UnifyLine, operated by IntelSys Technologies. By creating an account, you agree to these terms.</p>
      {sections.map(({ title, content }) => (
        <div key={title} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{title}</h2>
          <p style={{ lineHeight: '1.7', color: '#374151' }}>{content}</p>
        </div>
      ))}
    </div>
  )
}