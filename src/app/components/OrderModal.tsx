'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'casket' | 'urn'
  preselectedItem?: any
  onSuccess: () => void
}

export default function OrderModal({ isOpen, onClose, itemType, onSuccess }: OrderModalProps) {
  if (!isOpen) return null

  const handleSubmit = () => {
    onSuccess()
    onClose()
    alert('Order processed successfully!')
  }

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
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Enter purchase order number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deceased Name *</label>
            <input
              type="text"
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