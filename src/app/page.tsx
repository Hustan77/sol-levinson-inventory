// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PlusCircle } from 'lucide-react'
import OrderModal from './components/OrderModal'

const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 transition ${props.className || ''}`}
  />
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Define types for our data
interface Order {
  id: number
  deceased_name: string
  po_number: string
  expected_date: string
  status: string
}

interface CountResult {
  count: number | null
}

export default function Page() {
  const [orders, setOrders] = useState<Order[]>([])
  const [showModal, setShowModal] = useState(false)
  const [counts, setCounts] = useState({
    caskets: 0,
    urns: 0,
    suppliers: 0,
    orders: 0,
  })

  useEffect(() => {
    const fetchCounts = async () => {
      const tables = ['caskets', 'urns', 'suppliers_list', 'casket_orders']
      const newCounts: Record<string, number> = {}
      for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
        newCounts[table] = count || 0
      }
      setCounts({
        caskets: newCounts['caskets'],
        urns: newCounts['urns'],
        suppliers: newCounts['suppliers_list'],
        orders: newCounts['casket_orders'],
      })
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase.from('casket_orders').select('*').order('expected_date')
      if (!error && data) setOrders(data as Order[])
    }

    fetchCounts()
    fetchOrders()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Inventory Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card title="Caskets" value={counts.caskets} />
          <Card title="Urns" value={counts.urns} />
          <Card title="Suppliers" value={counts.suppliers} />
          <Card title="Active Orders" value={counts.orders} />
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Active Orders</h2>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <PlusCircle size={18} /> Order Casket
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow hover:shadow-lg transition">
              <h3 className="font-bold text-lg">{order.deceased_name}</h3>
              <p className="text-sm">PO: {order.po_number}</p>
              <p className="text-sm">Expected: {order.expected_date}</p>
              <span className="inline-block mt-2 px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs uppercase">
                {order.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <OrderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        itemType="casket"
        onSuccess={() => window.location.reload()}
      />
    </main>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-white/20">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 blur-2xl opacity-20 pointer-events-none" />
      <h3 className="text-xs uppercase tracking-wider text-white/70 z-10 relative">{title}</h3>
      <p className="text-3xl font-extrabold text-white mt-1 z-10 relative">{value}</p>
    </div>
  );
}
