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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Conference Bridge</h2>
        <p className="text-gray-500 mt-1">Host multi-party conference calls on your UnifyLine numbers</p>
      </div>
      <div className="bg-gradient-to-r from-[#0C2C68] to-[#1A56C4] rounded-xl p-6 text-white mb-8">
        <h3 className="font-semibold text-lg mb-3">How to join</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: '1', text: 'Call your UnifyLine DID number' },
            { step: '2', text: 'Dial the room extension (e.g. 9001)' },
            { step: '3', text: 'Enter the PIN when prompted' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-[#0C2C68] flex items-center justify-center font-bold text-sm flex-shrink-0">{step}</div>
              <p className="text-blue-100 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-semibold text-gray-900">Conference Rooms</h3>
        {CONFERENCE_ROOMS.map(room => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${activeRoom === room.id ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Users size={22} className={activeRoom === room.id ? 'text-green-600' : 'text-gray-600'} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{room.name}</h4>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>Ext: <span className="font-mono font-medium text-gray-700">{room.id}</span></span>
                    <span>PIN: <span className="font-mono font-medium text-gray-700">{room.pin}</span></span>
                    <span>{room.did}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyInvite(room)} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  {copied === room.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied === room.id ? 'Copied!' : 'Copy invite'}
                </button>
                <button onClick={() => setActiveRoom(activeRoom === room.id ? null : room.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeRoom === room.id ? 'bg-red-100 text-red-700' : 'bg-[#0C2C68] text-white'}`}>
                  <Phone size={14} />
                  {activeRoom === room.id ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            {activeRoom === room.id && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700">Room active</span>
                </div>
                <p className="text-sm text-gray-600">Call {room.did} then dial {room.id} then PIN {room.pin}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h4 className="font-semibold text-amber-800 mb-2">Activate on FreeSWITCH (run once on Linode)</h4>
        <pre className="bg-amber-100 rounded p-3 text-xs font-mono text-amber-900 overflow-x-auto whitespace-pre-wrap">{`/usr/local/freeswitch/bin/fs_cli -x "reloadxml"
# Then paste the conference dialplan XML from the MPRD document`}</pre>
      </div>
    </div>
  )
}
