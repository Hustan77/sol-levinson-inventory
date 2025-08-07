'use client'

import { Dialog } from '@headlessui/react'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  onSuccess: () => void
  casket: Casket
}

export default function OrderCasketButton({ isOpen, onClose, onSuccess, casket }: Props) {
  const [poNumber, setPoNumber] = useState('')
  const [deceasedName, setDeceasedName] = useState('')
  const [expectedDate, setExpectedDate] = useState('')

  const handleOrder = async () => {
    const { error } = await supabase.from('orders').insert({
      po_number: poNumber,
      deceased_name: deceasedName,
      expected_date: expectedDate,
      product_id: casket.id,
      product_type: 'casket',
      status: 'PENDING'
    })

    if (!error) {
      onSuccess()
      onClose()
    } else {
      console.error(error)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-md rounded bg-white p-6 space-y-4 text-black">
          <Dialog.Title className="text-xl font-bold">Order Casket: {casket.name}</Dialog.Title>
          
          <input
            type="text"
            placeholder="PO Number"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />

          <input
            type="text"
            placeholder="Deceased Name"
            value={deceasedName}
            onChange={(e) => setDeceasedName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />

          <input
            type="date"
            placeholder="Expected Delivery Date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />

          <div className="flex justify-end space-x-2 pt-4">
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
              Cancel
            </button>
            <button onClick={handleOrder} className="px-4 py-2 bg-blue-600 text-white rounded">
              Submit
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
