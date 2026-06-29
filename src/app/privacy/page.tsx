export default function PrivacyPage() {
  const sections = [
    { title: '1. Information We Collect', content: 'We collect information you provide when creating an account, including your name, email address, phone number, and business information. We also collect call data, AI-generated transcripts and summaries, and usage information when you use our services.' },
    { title: '2. How We Use Your Information', content: 'We use your information to provide and improve our services, including AI receptionist functionality, call logging, and business notifications. We send transactional SMS and email messages to opted-in users, including hot lead alerts and daily briefing summaries of call activity.' },
    { title: '3. SMS Communications', content: 'By registering for a UnifyLine account and providing your phone number, you consent to receive business notification SMS messages from UnifyLine. These include hot lead alerts when qualified callers contact your business, and daily morning briefing summaries. Message and data rates may apply. Reply STOP to unsubscribe at any time. Reply HELP for help.' },
    { title: '4. How We Share Your Information', content: 'We do not sell your personal information. We may share information with service providers who assist in operating our platform (including Twilio for SMS, Resend for email, and Supabase for data storage), subject to confidentiality agreements.' },
    { title: '5. Data Security', content: 'We implement industry-standard security measures to protect your information, including encryption in transit and at rest.' },
    { title: '6. Data Retention', content: 'We retain your account information and call records for as long as your account is active. You may request deletion of your data by contacting us at support@unifyline.com.' },
    { title: '7. Your Rights', content: 'You have the right to access, correct, or delete your personal information. You may opt out of SMS communications at any time by replying STOP. To opt out of email communications, use the unsubscribe link in any email or contact support@unifyline.com.' },
    { title: '8. Contact Us', content: 'Questions about this Privacy Policy? Contact us at: support@unifyline.com | IntelSys Technologies | Atlanta, GA' },
  ]
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '48px 24px', color: '#111827' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Privacy Policy</h1>
      <p style={{ color: '#6B7280', marginBottom: '32px' }}>Last updated: June 29, 2026</p>
      <p style={{ marginBottom: '24px', lineHeight: '1.7', color: '#374151' }}>UnifyLine ("we," "us," or "our"), operated by IntelSys Technologies, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our AI-powered business communications platform at unifyline.com.</p>
      {sections.map(({ title, content }) => (
        <div key={title} style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{title}</h2>
          <p style={{ lineHeight: '1.7', color: '#374151' }}>{content}</p>
        </div>
      ))}
    </div>
  )
}