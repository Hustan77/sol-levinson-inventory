'use client'

import { useState } from 'react'

interface Order {
  id: number
  name: string
  status: string
  expected_date: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  order: Order
  onSuccess: () => void
}

export default function ArrivalModal({ isOpen, onClose, order, onSuccess }: Props) {
  const [arrivalDate, setArrivalDate] = useState('')

  const handleArrival = async () => {
    try {
      // Example update — adjust based on your schema
      const res = await fetch(`/api/caskets/${order.id}/arrived`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivalDate }),
      })

      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        alert('Failed to update')
      }
    } catch (error) {
      console.error(error)
      alert('Error updating arrival')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-black">
        <h2 className="text-xl font-semibold mb-4">Mark Casket as Arrived</h2>
        <p className="mb-2">
          <strong>{order.name}</strong>
        </p>
        <label className="block mb-2">
          Arrival Date:
          <input
            type="date"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
          />
        </label>
        <div className="flex justify-end mt-4 gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">
            Cancel
          </button>
          <button onClick={handleArrival} className="px-4 py-2 rounded bg-blue-600 text-white">
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
