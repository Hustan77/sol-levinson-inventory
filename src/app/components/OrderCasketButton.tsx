'use client'

import React, { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import OrderModal from './OrderModal'

export default function OrderCasketButton() {
  const [show, setShow] = useState(false)

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
      >
        <PlusCircle size={18} />
        Order Casket
      </button>
      <OrderModal
        isOpen={show}
        onClose={() => setShow(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  )
}
