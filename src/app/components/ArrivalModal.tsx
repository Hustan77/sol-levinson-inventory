// ArrivalModal.tsx – Modernized for Casket Arrival with Order Context
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
  order: {
    id: number
    type: 'casket' | 'urn'
    name: string
    casket_id: number
    quantity: number
    backordered: boolean
    po_number: string
  }
  onSuccess: () => void
  casket: {
    id: number
    name: string
    on_hand: number
    on_order: number
    backordered_quantity: number
  }
}

export default function ArrivalModal({ isOpen, onClose, order, casket, onSuccess }: Props) {
  const [markedBy, setMarkedBy] = useState('')
  const [arrivedAt, setArrivedAt] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMarkedBy('')
      setArrivedAt(new Date().toISOString().slice(0, 16))
    }
  }, [isOpen])

  if (!isOpen || !order || !casket) return null

  const handleSubmit = async () => {
    try {
      const iso = new Date(arrivedAt).toISOString()
      const short = iso.split('T')[0]

      // Update order record
      await supabase.from('casket_orders').update({
        status: 'arrived',
        actual_arrival_date: short,
        arrived_marked_by: markedBy,
        arrived_marked_at: iso
      }).eq('id', order.id)

      // Adjust casket inventory
      const updated = {
        on_hand: casket.on_hand + order.quantity,
        on_order: order.backordered ? casket.on_order : Math.max(0, casket.on_order - order.quantity),
        backordered_quantity: order.backordered ? Math.max(0, casket.backordered_quantity - order.quantity) : casket.backordered_quantity
      }

      const { error } = await supabase.from('caskets').update({
        ...updated,
        updated_at: iso
      }).eq('id', casket.id)

      if (error) throw error

      onClose()
      onSuccess()
    } catch (err) {
      console.error('Arrival update failed:', err)
      alert('Failed to mark arrival.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Mark Arrival</h3>
        <div className="mb-2 text-slate-700">
          <div className="font-medium">{order.name}</div>
          <div className="text-sm">PO#: {order.po_number}</div>
        </div>
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
