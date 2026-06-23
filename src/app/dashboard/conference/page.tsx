'use client'
import { useState } from 'react'
import { Phone, Users, Copy, Check } from 'lucide-react'

const CONFERENCE_ROOMS = [
  { id: '9001', name: 'Main Conference Room', pin: '1234', did: '(404) 592-5562' },
  { id: '9002', name: 'Sales Team Room', pin: '5678', did: '(404) 592-9690' },
  { id: '9003', name: 'Prayer Line', pin: '7777', did: '(678) 460-5180' },
]

export default function ConferencePage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeRoom, setActiveRoom] = useState<string | null>(null)

  const copyInvite = (room: typeof CONFERENCE_ROOMS[0]) => {
    navigator.clipboard.writeText(`Join UnifyLine Conference\nCall: ${room.did}\nExtension: ${room.id}\nPIN: ${room.pin}`)
    setCopied(room.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Conference Bridge</h2>
        <p className="text-gray-500 mt-1 text-sm">Host multi-party conference calls on your UnifyLine numbers</p>
      </div>

      <div className="bg-gradient-to-r from-[#0C2C68] to-[#1A56C4] rounded-xl p-4 md:p-6 text-white mb-6">
        <h3 className="font-semibold text-base mb-3">How to join</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { step: '1', text: 'Call your UnifyLine DID number' },
            { step: '2', text: 'Dial the room extension (e.g. 9001)' },
            { step: '3', text: 'Enter the PIN when prompted' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white text-[#0C2C68] flex items-center justify-center font-bold text-sm flex-shrink-0">{step}</div>
              <p className="text-blue-100 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Conference Rooms</h3>
        {CONFERENCE_ROOMS.map(room => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${activeRoom === room.id ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Users size={20} className={activeRoom === room.id ? 'text-green-600' : 'text-gray-600'} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm md:text-base">{room.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                    <span>Ext: <span className="font-mono font-medium text-gray-700">{room.id}</span></span>
                    <span>PIN: <span className="font-mono font-medium text-gray-700">{room.pin}</span></span>
                    <span>{room.did}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => copyInvite(room)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">
                  {copied === room.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  <span className="hidden sm:inline">{copied === room.id ? 'Copied!' : 'Copy'}</span>
                </button>
                <button onClick={() => setActiveRoom(activeRoom === room.id ? null : room.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${activeRoom === room.id ? 'bg-red-100 text-red-700' : 'bg-[#0C2C68] text-white'}`}>
                  <Phone size={12} />
                  {activeRoom === room.id ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            {activeRoom === room.id && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-700">Room active</span>
                </div>
                <p className="text-xs text-gray-600">Call {room.did} → dial {room.id} → enter PIN {room.pin}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
