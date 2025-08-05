// ArrivalModal.tsx — Cleaned and Type-Safe
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Casket {
  id: number
  name: string
  on_hand: number
  on_order: number
  target_quantity: number
  backordered_quantity: number
  updated_at: string
  supplier?: string
}

interface Order {
  id: number
  type: 'casket' | 'urn' | 'special'
  name: string
  supplier?: string
  family_name?: string
  deceased_name?: string
  expected_date: string
  service_date?: string
  urgency: 'on-time' | 'urgent' | 'late'
  days_remaining: number
  po_number?: string
  casket_id?: number
  quantity?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  order: Order
  onSuccess: () => void
  caskets: Casket[]
}

export default function ArrivalModal({ isOpen, onClose, order, onSuccess, caskets }: Props) {
  const [markedBy, setMarkedBy] = useState('')
  const [arrivedAt, setArrivedAt] = useState(new Date().toISOString().slice(0, 16))

  useEffect(() => {
    if (isOpen) {
      setMarkedBy('')
      setArrivedAt(new Date().toISOString().slice(0, 16))
    }
  }, [isOpen])

  if (!isOpen || !order) return null

  const handleSubmit = async () => {
    try {
      const iso = new Date(arrivedAt).toISOString()
      const short = iso.split('T')[0]

      await supabase.from('casket_orders').update({
        status: 'arrived',
        actual_arrival_date: short,
        arrived_marked_by: markedBy,
        arrived_marked_at: iso
      }).eq('id', order.id)

      if (order.casket_id && order.quantity) {
        const related = caskets.find(c => c.id === order.casket_id)
        if (related) {
          await supabase.from('caskets').update({
            on_hand: related.on_hand + order.quantity,
            on_order: Math.max(0, related.on_order - order.quantity),
            updated_at: iso
          }).eq('id', order.casket_id)
        }
      }

      onClose()
      onSuccess()
    } catch (err) {
      console.error(err)
      alert('Failed to mark arrival.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Mark Arrival: {order.deceased_name}</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Marked by"
            value={markedBy}
            onChange={(e) => setMarkedBy(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
          <input
            type="datetime-local"
            value={arrivedAt}
            onChange={(e) => setArrivedAt(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
