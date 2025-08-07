'use client'

import React from 'react'

interface Order {
  id: number
  deceased_name: string
  po_number: string
  expected_date: string
  status: 'PENDING' | 'ARRIVED'
}

export default function OrderCard({ order }: { order: Order }) {
  return (
    <div className="rounded-lg bg-black/40 p-4 text-white shadow-md border border-white/10 backdrop-blur-lg transition hover:scale-[1.01] hover:shadow-xl duration-300 ease-in-out">
      <h3 className="text-lg font-semibold">{order.deceased_name}</h3>
      <p className="text-sm text-white/80">PO: {order.po_number}</p>
      <p className="text-sm text-white/80">Expected: {order.expected_date}</p>
      <span
        className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${
          order.status === 'ARRIVED'
            ? 'bg-green-500/20 text-green-300'
            : 'bg-yellow-500/20 text-yellow-300'
        }`}
      >
        {order.status}
      </span>
    </div>
  )
}
