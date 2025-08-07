/*
  Order modal component for creating new casket or urn orders.

  This component replaces the simple placeholder in the original app with a
  fully styled modal consistent with the new glassmorphic design. When open,
  it darkens the background with a semi‑transparent overlay and centers a
  frosted glass card for the form. The form collects a purchase order number
  and the deceased person’s name. On submit, the appropriate Supabase table
  (casket_orders or urn_orders) is inserted into. After insertion the modal
  closes, `onSuccess` is called to refresh the dashboard, and a toast can be
  implemented later to notify the user.

  Environment variables must include `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`【891684312562047†L247-L272】 so that
  Supabase can be accessed from the client side.
*/
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'casket' | 'urn'
  onSuccess: () => void
}

export default function OrderModal({ isOpen, onClose, itemType, onSuccess }: OrderModalProps) {
  const [poNumber, setPoNumber] = useState('')
  const [deceasedName, setDeceasedName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!poNumber || !deceasedName) return
    setSubmitting(true)
    try {
      const table = itemType === 'casket' ? 'casket_orders' : 'urn_orders'
      const expectedDate = new Date().toISOString() // for demonstration; you can adjust accordingly
      const { error } = await supabase.from(table).insert({
        po_number: poNumber,
        deceased_name: deceasedName,
        expected_date: expectedDate,
        status: 'ordered',
      })
      if (error) {
        console.error('Insert error:', error)
      } else {
        // reset fields and close modal
        setPoNumber('')
        setDeceasedName('')
        onSuccess()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white/40 p-6 backdrop-blur-lg shadow-2xl ring-1 ring-white/20">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Order {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              PO Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/30 bg-white/50 p-2 text-gray-900 placeholder-gray-500 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Enter purchase order number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Deceased Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deceasedName}
              onChange={(e) => setDeceasedName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/30 bg-white/50 p-2 text-gray-900 placeholder-gray-500 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Enter name of deceased"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/30 bg-white/30 px-4 py-2 text-gray-800 backdrop-blur-sm hover:bg-white/40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2 font-semibold text-white shadow-md transition-colors hover:from-sky-600 hover:to-sky-700 disabled:opacity-50"
          >
            {submitting ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}