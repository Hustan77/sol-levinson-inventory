'use client'

import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OrderModal({ isOpen, onClose, onSuccess }: Props) {
  const [deceased, setDeceased] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [status, setStatus] = useState<'PENDING' | 'BACKORDERED' | 'SPECIAL'>('PENDING')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    const { error } = await supabase.from('orders').insert([
      {
        deceased,
        po_number: poNumber,
        expected_date: expectedDate,
        status,
      },
    ])

    setLoading(false)
    if (!error) {
      onSuccess()
      onClose()
    } else {
      alert('Error saving order: ' + error.message)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white/10 backdrop-blur-md rounded-xl p-6 max-w-md mx-auto mt-24 border border-white/20 shadow-lg text-white">
        <Dialog.Title className="text-lg font-semibold mb-4">Order New Casket</Dialog.Title>

        <div className="space-y-4">
          <div>
            <label className="text-sm">Deceased Name</label>
            <input
              className="w-full p-2 rounded bg-white/20 border border-white/30 mt-1"
              value={deceased}
              onChange={(e) => setDeceased(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">PO Number</label>
            <input
              className="w-full p-2 rounded bg-white/20 border border-white/30 mt-1"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Expected Delivery Date</label>
            <input
              type="date"
              className="w-full p-2 rounded bg-white/20 border border-white/30 mt-1"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Status</label>
            <select
              className="w-full p-2 rounded bg-white/20 border border-white/30 mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="PENDING">Pending</option>
              <option value="BACKORDERED">Backordered</option>
              <option value="SPECIAL">Special</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
