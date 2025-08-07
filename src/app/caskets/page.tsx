'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import ArrivalModal from '../components/ArrivalModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Casket {
  id: number
  name: string
  status: string
  expected_date: string
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [showArrivalModal, setShowArrivalModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Casket | null>(null)

  const loadData = async () => {
    const { data } = await supabase.from('caskets').select('*')
    if (data) setCaskets(data)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Caskets</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {caskets.map((casket) => (
          <div
            key={casket.id}
            className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow hover:shadow-lg transition cursor-pointer"
            onClick={() => {
              setSelectedOrder(casket)
              setShowArrivalModal(true)
            }}
          >
            <h3 className="text-lg font-semibold">{casket.name}</h3>
            <p>Status: {casket.status}</p>
            <p>Expected: {casket.expected_date}</p>
          </div>
        ))}
      </div>

      {showArrivalModal && selectedOrder && (
        <ArrivalModal
          isOpen={showArrivalModal}
          onClose={() => setShowArrivalModal(false)}
          order={selectedOrder}
          onSuccess={loadData}
        />
      )}
    </main>
  )
}
