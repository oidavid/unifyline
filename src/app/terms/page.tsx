export default function TermsPage() {
  const sections = [
    { title: '1. Service Description', content: 'UnifyLine provides AI-powered business communications services including an AI receptionist, call management, team softphone, and business intelligence tools for small and medium businesses.' },
    { title: '2. Account Registration', content: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. By providing your phone number, you consent to receive transactional SMS notifications from UnifyLine.' },
    { title: '3. SMS Terms', content: 'UnifyLine sends transactional SMS messages to opted-in account holders including hot lead alerts and daily briefing summaries. Message frequency varies based on call volume. Message and data rates may apply. Reply STOP to unsubscribe. Reply HELP for assistance. For support contact support@unifyline.com.' },
    { title: '4. Acceptable Use', content: 'You agree to use UnifyLine only for lawful business purposes. You may not use our services to harass, spam, or communicate with individuals who have not consented to receive communications.' },
    { title: '5. Payment and refunds', content: 'Managed service is sold two ways. Monthly service is $297 per month plus a $997 setup fee, with the first month charged at signing. It has a 3-month minimum, then continues month-to-month and can be canceled on 30 days\' notice. Prepay is a 12-month agreement of $3,564 paid upfront, and setup is waived. A prepaid term does not auto-renew at a higher price. We send a renewal notice 30 days before it ends. After a monthly plan passes its 3-month minimum, we may change the monthly price with 30 days\' notice. A signed agreement controls if it differs from these terms.\n\nBefore the service goes live, we refund everything paid, whoever cancels. If we miss the agreed go-live date by more than 5 business days for reasons on our side, we refund everything paid, even after go-live. Within 30 days after go-live, we keep the months already started at $297 plus a $997 onboarding fee and refund the rest. In that 30-day window the monthly plan\'s 3-month minimum is waived, and nothing further is owed. After those 30 days, a prepaid term is non-refundable for the months still left in the 12-month agreement, and a monthly plan follows the cancellation terms above. If the line is down for more than 3 days in a month, or a feature we sold does not work, we refund the unused full months and do not keep an onboarding fee.' },
    { title: '6. Limitation of Liability', content: 'UnifyLine is provided "as is." To the maximum extent permitted by law, IntelSys Technologies shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.' },
    { title: '7. Contact', content: 'For questions about these terms, contact us at support@unifyline.com | IntelSys Technologies | Atlanta, GA' },
  ]
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '48px 24px', color: '#111827' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Terms of Service</h1>
      <p style={{ color: '#6B7280', marginBottom: '32px' }}>Last updated: October 15, 2026</p>
      <p style={{ marginBottom: '24px', lineHeight: '1.7', color: '#374151' }}>These Terms of Service govern your use of UnifyLine, operated by IntelSys Technologies. By creating an account, you agree to these terms.</p>
      {sections.map(({ title, content }) => (
        <div key={title} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{title}</h2>
          {content.split('\n\n').map(paragraph => (
            <p key={paragraph.slice(0, 40)} style={{ lineHeight: '1.7', color: '#374151', marginBottom: '12px' }}>{paragraph}</p>
          ))}
        </div>
      ))}
    </div>
  )
}