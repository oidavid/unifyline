'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, Plus, Phone, Mail } from 'lucide-react'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone_e164: '', email: '', notes: '' })
  const supabase = createClient()

  useEffect(() => { loadContacts() }, [])

  async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', user.id)
      .order('name')
    setContacts(data || [])
    setLoading(false)
  }

  async function handleAddContact() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('contacts').insert({ ...newContact, account_id: user.id })
    setNewContact({ name: '', phone_e164: '', email: '', notes: '' })
    setShowAdd(false)
    loadContacts()
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <p className="text-gray-500 mt-1">Manage your business contacts</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#0C2C68] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1A56C4] transition"
        >
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Full Name"
              value={newContact.name}
              onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
            />
            <input
              placeholder="Phone (e.g. 12345678900)"
              value={newContact.phone_e164}
              onChange={e => setNewContact(c => ({ ...c, phone_e164: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
            />
            <input
              placeholder="Email"
              value={newContact.email}
              onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
            />
            <input
              placeholder="Notes"
              value={newContact.notes}
              onChange={e => setNewContact(c => ({ ...c, notes: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2C68]"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddContact}
              className="bg-[#0C2C68] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1A56C4] transition"
            >
              Save Contact
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : contacts.length > 0 ? (
          <div className="divide-y">
            {contacts.map(contact => (
              <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0C2C68] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {contact.phone_e164 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone size={12} /> {contact.phone_e164}
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail size={12} /> {contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No contacts yet</p>
            <p className="text-sm mt-1">Add your first contact to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
