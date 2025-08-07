// src/app/caskets/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Pencil, Trash2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Casket {
  id: number
  name: string
  supplier: string
  on_hand: number
  on_order: number
  target_quantity: number
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])

  useEffect(() => {
    const fetchCaskets = async () => {
      const { data, error } = await supabase.from('caskets').select('*')
      if (!error && data) setCaskets(data as Casket[])
    }

    fetchCaskets()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Casket Inventory</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caskets.map((casket) => (
            <div key={casket.id} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow hover:shadow-lg transition">
              <h2 className="text-xl font-semibold mb-2">{casket.name}</h2>
              <p className="text-sm text-gray-300 mb-1">Supplier: {casket.supplier}</p>
              <p className="text-sm text-gray-300 mb-1">On Hand: {casket.on_hand}</p>
              <p className="text-sm text-gray-300 mb-1">On Order: {casket.on_order}</p>
              <p className="text-sm text-gray-300">Target Qty: {casket.target_quantity}</p>
              <div className="flex gap-3 mt-3">
                <button className="text-blue-300 hover:text-blue-400">
                  <Pencil size={18} />
                </button>
                <button className="text-red-300 hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
