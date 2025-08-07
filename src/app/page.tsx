// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import GlassCard from './components/GlassCard'
import OrderBadge from './components/OrderBadge'
import NewOrderModal from './components/NewOrderModal'

// ---- Types that match v_orders_enriched view ----
type ItemKind = 'CASKET' | 'URN'
type OrderKind = 'STOCK' | 'SPECIAL'
type OrderStatus = 'PENDING' | 'BACKORDERED' | 'ARRIVED' | 'CANCELLED' | string

type EnrichedOrder = {
  id: number
  item_kind: ItemKind
  order_kind: OrderKind
  status: OrderStatus
  deceased_name: string | null
  po_number: string | null
  expected_date: string | null
  product_name: string | null
  ordering_instructions: string | null
  supplier_name: string | null
  created_at: string
}

export default function Page() {
  // KPI counts
  const [counts, setCounts] = useState({
    caskets: 0,
    urns: 0,
    suppliers: 0,
    orders: 0,
  })

  // Orders list
  const [orders, setOrders] = useState<EnrichedOrder[]>([])

  // Modal state
  const [newOpen, setNewOpen] = useState(false)

  // Load dashboard data
  async function load() {
    // Fetch counts in parallel
    const [c1, c2, c3, c4] = await Promise.all([
      supabase.from('caskets').select('*', { count: 'exact', head: true }),
      supabase.from('urns').select('*', { count: 'exact', head: true }),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ])

    const casketsCount = c1.count ?? 0
    const urnsCount = c2.count ?? 0
    const suppliersCount = c3.count ?? 0
    const ordersCount = c4.count ?? 0

    // Fetch enriched orders for list (includes product/supplier names + instructions)
    const { data: orderRows } = await supabase
      .from('v_orders_enriched')
      .select('*')
      .order('expected_date', { ascending: true })
      .order('created_at', { ascending: false })

    setCounts({
      caskets: casketsCount,
      urns: urnsCount,
      suppliers: suppliersCount,
      orders: ordersCount,
    })

    setOrders((orderRows as EnrichedOrder[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Inventory Dashboard</h1>
          <button
            onClick={() => setNewOpen(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700"
            aria-label="Create new order"
          >
            New Order
          </button>
        </header>

        {/* KPI Tiles */}
        <section className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <GlassCard title="Caskets" value={counts.caskets} />
          <GlassCard title="Urns" value={counts.urns} />
          <GlassCard title="Suppliers" value={counts.suppliers} />
          <GlassCard title="Active Orders" value={counts.orders} />
        </section>

        {/* Orders List */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">All Orders</h2>

          <div className="grid gap-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow transition hover:shadow-lg"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">
                      {o.deceased_name || 'Deceased: N/A'}
                    </div>

                    <div className="text-sm text-white/70">
                      {o.item_kind} • {o.order_kind} • {o.product_name ?? 'Custom'}
                    </div>

                    <div className="text-sm text-white/70">
                      PO:{' '}
                      <span className="text-white">
                        {o.po_number ?? 'N/A'}
                      </span>{' '}
                      • Expected:{' '}
                      <span className="text-white">
                        {o.expected_date ?? 'TBD'}
                      </span>
                    </div>

                    {o.supplier_name && (
                      <div className="text-sm text-white/60">
                        Supplier: {o.supplier_name}
                      </div>
                    )}
                  </div>

                  {/* Status + Mark Arrived */}
                  <OrderBadge
                    status={o.status}
                    onArrive={
                      o.status === 'PENDING' || o.status === 'BACKORDERED'
                        ? async () => {
                            const { error } = await supabase
                              .from('orders')
                              .update({
                                status: 'ARRIVED',
                                arrival_marked_at: new Date().toISOString(),
                              })
                              .eq('id', o.id)

                            if (!error) await load()
                          }
                        : undefined
                    }
                  />
                </div>

                {/* Ordering Instructions panel */}
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                  <div className="mb-1 font-medium text-white/90">
                    Ordering Instructions
                  </div>
                  <div className="whitespace-pre-wrap">
                    {o.ordering_instructions ?? '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* New Order Modal */}
      <NewOrderModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={load} />
    </main>
  )
}
