'use client'
import { useState } from 'react'
import { Phone, Delete } from 'lucide-react'

export default function Dialpad() {
  const [number, setNumber] = useState('')
  const [calling, setCalling] = useState(false)
  const [status, setStatus] = useState('')

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ]

  function pressKey(key: string) {
    setNumber(n => n + key)
  }

  function deleteKey() {
    setNumber(n => n.slice(0, -1))
  }

  async function makeCall() {
    if (!number) return
    setCalling(true)
    setStatus('Initiating call...')
    try {
      const res = await fetch('/api/calls/originate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: number,
          callerId: '16789235637',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus(Calling ...)
      } else {
        setStatus('Call failed. Please try again.')
      }
    } catch {
      setStatus('Error placing call.')
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 w-full max-w-xs">
      <h3 className="font-semibold text-gray-900 mb-4 text-center">Make a Call</h3>
      <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-xl font-mono text-gray-800 tracking-wider">
          {number || <span className="text-gray-300">Enter number</span>}
        </span>
        {number && (
          <button onClick={deleteKey} className="text-gray-400 hover:text-gray-600">
            <Delete size={18} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {keys.flat().map(key => (
          <button
            key={key}
            onClick={() => pressKey(key)}
            className="bg-gray-100 hover:bg-gray-200 rounded-lg py-3 text-lg font-semibold text-gray-700 transition"
          >
            {key}
          </button>
        ))}
      </div>
      <button
        onClick={makeCall}
        disabled={!number || calling}
        className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
      >
        <Phone size={20} />
        {calling ? 'Calling...' : 'Call'}
      </button>
      {status && (
        <p className="text-center text-sm text-gray-500 mt-3">{status}</p>
      )}
    </div>
  )
}
