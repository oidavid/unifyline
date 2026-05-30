'use client'
import { Check, Zap, Building, Phone } from 'lucide-react'

const PLANS = [
  {
    name: 'Starter', price: 29, highlight: false, icon: Phone,
    description: 'Perfect for solo entrepreneurs and diaspora businesses',
    features: ['1 DID number', '500 minutes/month', 'AI Receptionist', '200 SMS messages', 'Call logs and summaries', 'Email support'],
    cta: 'Get Started',
  },
  {
    name: 'Business', price: 79, highlight: true, icon: Zap,
    description: 'Full AI suite for growing businesses with 2-20 team members',
    features: ['3 DID numbers', '2,000 minutes/month', 'Full AI suite', 'IVR builder', 'Conference bridge', 'CRM webhooks', 'Priority support'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Ministry', price: 79, highlight: false, icon: Building,
    description: 'Flat rate for churches, ministries and faith organizations',
    features: ['3 DID numbers', '3,000 minutes/month', 'Prayer line AI', 'Broadcast SMS', 'Event tools', 'Conference bridge', 'Up to 10 users'],
    cta: 'Start Free Trial',
  },
]

export default function BillingPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Plans and Billing</h2>
        <p className="text-gray-500 mt-1">Enterprise communications at human pricing</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="font-semibold text-[#0C2C68]">Current Plan: <span className="font-normal">Free Beta</span></p>
          <p className="text-sm text-gray-600 mt-0.5">You are on a free beta plan. Upgrade to unlock all features.</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Active</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PLANS.map(plan => (
          <div key={plan.name} className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden ${plan.highlight ? 'border-[#0C2C68] ring-2 ring-[#0C2C68]' : 'border-gray-200'}`}>
            {plan.highlight && <div className="bg-[#0C2C68] text-white text-center py-2 text-xs font-semibold tracking-wide uppercase">Most Popular</div>}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <plan.icon size={20} className="text-[#0C2C68]" />
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              </div>
              <div className="mb-3">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <p className="text-sm text-gray-500 mb-5">{plan.description}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${plan.highlight ? 'bg-[#0C2C68] text-white hover:bg-[#1A56C4]' : 'border border-[#0C2C68] text-[#0C2C68] hover:bg-blue-50'}`}>
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Current Usage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Minutes Used', value: '0', limit: '500' },
            { label: 'SMS Sent', value: '0', limit: '200' },
            { label: 'AI Calls Handled', value: '0', limit: 'Unlimited' },
            { label: 'Active DIDs', value: '5', limit: '5' },
          ].map(({ label, value, limit }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">of {limit}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-gray-400 mt-6">Stripe payment integration coming soon. Contact us to upgrade early.</p>
    </div>
  )
}
