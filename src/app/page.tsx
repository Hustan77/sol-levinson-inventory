// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import OrderCard from './components/OrderCard'

type ViewRow = {
  id: number
  product_name: string | null
  supplier_name: string | null
  status: 'PENDING' | 'ARRIVED' | 'BACKORDERED' | string
  po_number: string | null
  created_at: string // orderedAt
  expected_date: string | null
}

type Kpi = { caskets: number; urns: number; suppliers: number; orders: number }

export default function DashboardPage() {
  const [kpi, setKpi] = useState<Kpi>({ caskets: 0, urns: 0, suppliers: 0, orders: 0 })
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<ViewRow[]>([])

  async function load() {
    setLoading(true)

    // 1) KPIs in parallel
    const [casketsCnt, urnsCnt, suppliersCnt, ordersCnt] = await Promise.all([
      supabase.from('caskets').select('*', { count: 'exact', head: true }),
      supabase.from('urns').select('*', { count: 'exact', head: true }),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ])

    setKpi({
      caskets: casketsCnt.count ?? 0,
      urns: urnsCnt.count ?? 0,
      suppliers: suppliersCnt.count ?? 0,
      orders: ordersCnt.count ?? 0,
    })

    // 2) Orders list from the enriched view
    const { data } = await supabase
      .from('v_orders_enriched')
      .select('*')
      .order('expected_date', { ascending: true })
      .order('created_at', { ascending: false })

    setOrders((data as ViewRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">Inventory Dashboard</h1>
          <button
            onClick={load}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Refresh
          </button>
        </header>

        {/* KPI tiles */}
        <section className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <KpiCard label="Caskets" value={kpi.caskets} />
          <KpiCard label="Urns" value={kpi.urns} />
          <KpiCard label="Suppliers" value={kpi.suppliers} />
          <KpiCard label="Active Orders" value={kpi.orders} />
        </section>

        {/* Orders */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Orders</h2>
            {loading && <span className="text-sm text-white/60">Loading…</span>}
          </div>

          {orders.length === 0 && !loading ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((r) => (
                <OrderCard
                  key={r.id}
                  order={{
                    id: r.id,
                    productName: r.product_name ?? 'Custom Item',
                    supplierName: r.supplier_name ?? '—',
                    status: normalizeStatus(r.status),
                    poNumber: r.po_number ?? '—',
                    orderedAt: toDate(r.created_at),
                    expectedAt: r.expected_date ? toDate(r.expected_date) : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

/* ---------- helpers & small components ---------- */

function normalizeStatus(s: string): 'PENDING' | 'ARRIVED' | 'BACKORDERED' {
  const u = s.toUpperCase()
  if (u.includes('ARRIVED') || u === 'DELIVERED') return 'ARRIVED'
  if (u.includes('BACK')) return 'BACKORDERED'
  return 'PENDING'
}

function toDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString()
  } catch {
    return iso
  }
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur-md transition-transform will-change-transform hover:scale-[1.02]">
      <p className="text-xs tracking-widest text-white/60">{label.toUpperCase()}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70 backdrop-blur-md">
      No orders yet. Use your ordering flow to add one, then come back here.
    </div>
  )
}
