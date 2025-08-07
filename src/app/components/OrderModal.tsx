'use client'

import { Dialog } from '@headlessui/react'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Casket {
  id: number
  name: string
  on_hand: number
  on_order: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  casket: Casket
  onSuccess: () => void
}

export default function OrderModal({ isOpen, onClose, casket, onSuccess }: Props) {
  const [poNumber, setPoNumber] = useState('')
  const [deceasedName, setDeceasedName] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [isBackordered, setIsBackordered] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const { error } = await supabase.from('orders').insert({
      product_id: casket.id,
      product_type: 'casket',
      po_number: poNumber,
      deceased_name: deceasedName,
      expected_date: expectedDate,
      status: isBackordered ? 'backordered' : 'pending'
    })

    if (!error) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 text-black">
          <Dialog.Title className="text-xl font-bold mb-4">Order Casket</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Deceased Name</label>
              <input
                type="text"
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">PO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded p-2"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isBackordered}
                onChange={(e) => setIsBackordered(e.target.checked)}
              />
              <label>Backordered</label>
            </div>

            <div className="flex justify-end space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-300">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
                Submit
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
