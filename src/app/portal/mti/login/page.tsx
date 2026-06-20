'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MTI_LOGO_URL = 'https://mtipremiumcharters.com/uploads/company/lgo_mti__68daa57a29067.png'
const GOLD = '#D4B483'
const BLACK = '#0A0A0A'
const IVORY = '#F7F5F0'

export default function MTIPortalLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/portal/mti/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/portal/mti')
        router.refresh()
      } else {
        setError('Incorrect access code. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BLACK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MTI_LOGO_URL}
            alt="MTI Premium Charters"
            style={{ height: '64px', width: 'auto', margin: '0 auto' }}
          />
        </div>

        <div
          style={{
            background: IVORY,
            borderTop: `3px solid ${GOLD}`,
            padding: '40px 36px',
          }}
        >
          <div
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8A8378',
              fontWeight: 700,
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            Private Portal
          </div>
          <h1
            style={{
              fontSize: '22px',
              color: BLACK,
              textAlign: 'center',
              margin: '0 0 32px',
              fontWeight: 'normal',
            }}
          >
            Call Intelligence Access
          </h1>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="access-code"
              style={{
                display: 'block',
                fontFamily: 'Arial, sans-serif',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#5A5448',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              Access Code
            </label>
            <input
              id="access-code"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px 16px',
                fontSize: '16px',
                fontFamily: 'Arial, sans-serif',
                border: '1px solid #D8D2C4',
                background: '#FFFFFF',
                color: BLACK,
                marginBottom: '8px',
              }}
            />

            {error && (
              <div
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '13px',
                  color: '#A33A3A',
                  marginBottom: '8px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '14px',
                background: loading || !password ? '#CFC7B5' : BLACK,
                color: GOLD,
                border: 'none',
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: loading || !password ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Verifying...' : 'Enter Portal'}
            </button>
          </form>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#5A5448',
            letterSpacing: '0.04em',
          }}
        >
          Powered by UnifyLine
        </div>
      </div>
    </div>
  )
}
