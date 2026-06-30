'use client'
import React, { useState } from 'react'
import { CheckCircle, Phone, Mail, Building2 } from 'lucide-react'

export default function GetStartedPage() {
  const [form, setForm] = useState({
    business_name: '', contact_name: '', email: '', phone: '', industry: '', message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/lead-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch (e) {
      setError('Something went wrong. Please try again or email us directly.')
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Thanks for reaching out!</h1>
          <p className="text-gray-500 text-sm">
            We've received your request and will be in touch within one business day to schedule a personalized demo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started with UnifyLine</h1>
          <p className="text-gray-500">
            Tell us about your business and we'll set up a personalized demo of your AI receptionist.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Building2 size={14} className="inline mr-1.5 -mt-0.5" />
                Business Name *
              </label>
              <input
                required
                value={form.business_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, business_name: e.target.value }))}
                placeholder="Acme Corp"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name *</label>
              <input
                required
                value={form.contact_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, contact_name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                Email *
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, email: e.target.value }))}
                placeholder="jane@acmecorp.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Phone size={14} className="inline mr-1.5 -mt-0.5" />
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: typeof form) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 404 555 1234"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
            <select
              value={form.industry}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f: typeof form) => ({ ...f, industry: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Select an industry</option>
              <option value="technology">Technology & Software</option>
              <option value="professional_services">Professional Services</option>
              <option value="healthcare">Healthcare</option>
              <option value="financial_services">Financial Services & Banking</option>
              <option value="manufacturing">Manufacturing & Industrial</option>
              <option value="transportation">Transportation & Logistics</option>
              <option value="retail">Retail & E-commerce</option>
              <option value="real_estate">Real Estate & Construction</option>
              <option value="hospitality">Hospitality, Travel & Events</option>
              <option value="education">Education</option>
              <option value="government">Government & Public Sector</option>
              <option value="nonprofit">Nonprofit & NGOs</option>
              <option value="media">Media, Marketing & Advertising</option>
              <option value="telecommunications">Telecommunications</option>
              <option value="energy">Energy & Utilities</option>
              <option value="agriculture">Agriculture & Food</option>
              <option value="automotive">Automotive</option>
              <option value="legal">Legal Services</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              What are you hoping to solve? (optional)
            </label>
            <textarea
              value={form.message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f: typeof form) => ({ ...f, message: e.target.value }))}
              rows={3}
              placeholder="e.g. We miss calls during busy hours and need a way to capture leads after hours..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0C2C68] hover:bg-[#0a2255] text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Request a Demo'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            No commitment required. We'll reach out to schedule a personalized walkthrough.
          </p>
        </form>
      </div>
    </div>
  )
}
