// src/app/components/ArrivalModal.tsx
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
  onSuccess: () => void
  casket: Casket
}

export default function ArrivalModal({ isOpen, onClose, onSuccess, casket }: Props) {
  const [loading, setLoading] = useState(false)

  const markAsArrived = async () => {
    setLoading(true)

    const updated = {
      on_hand: casket.on_hand + 1,
      on_order: Math.max(casket.on_order - 1, 0),
    }

    const { error } = await supabase
      .from('caskets')
      .update(updated)
      .eq('id', casket.id)

    setLoading(false)

    if (!error) {
      onSuccess()
      onClose()
    } else {
      alert('Error updating inventory')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="w-full max-w-md bg-white p-6 rounded-xl shadow-lg text-black">
          <Dialog.Title className="text-xl font-bold mb-4">
            Mark “{casket.name}” as Arrived?
          </Dialog.Title>
          <p className="mb-4">
            This will <strong>increase on-hand</strong> by 1 and <strong>decrease on-order</strong> by 1.
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={markAsArrived}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
