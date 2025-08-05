'use client'

import { useState, useEffect } from 'react'
// Use the correct path for supabase
import { supabase } from '../../lib/supabase'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'casket' | 'urn'
  preselectedItem?: any
  onSuccess: () => void
}

export default function OrderModal({ isOpen, onClose, itemType, onSuccess }: OrderModalProps) {
  const [orderData, setOrderData] = useState({
    poNumber: '',
    deceasedName: ''
  })

  const handleSubmit = async () => {
    if (!orderData.poNumber || !orderData.deceasedName) {
      alert('Please fill in all required fields')
      return
    }

    // Simple success for now
    onSuccess()
    onClose()
    alert('Order processed successfully!')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">
          Order {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PO Number *</label>
            <input
              type="text"
              value={orderData.poNumber}
              onChange={(e) => setOrderData({...orderData, poNumber: e.target.value})}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Enter purchase order number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deceased Name *</label>
            <input
              type="text"
              value={orderData.deceasedName}
              onChange={(e) => setOrderData({...orderData, deceasedName: e.target.value})}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Enter name of deceased"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg"
          >
            Place Order
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