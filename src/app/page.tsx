/*
  Dashboard page for the redesigned inventory system.

  The original `page.tsx` contained a functional dashboard for viewing high‑level
  statistics (totals of caskets, urns, orders and suppliers) and a list of
  outstanding orders. This rewrite maintains the same data model but applies
  a modern glassmorphic design. Cards use semi‑transparent backgrounds and
  `backdrop-blur` to achieve the frosted glass effect recommended by Epic Web
  Dev【14648731404760†L20-L67】. Responsive grids ensure the layout adapts to any
  device. Quick actions allow staff to place new orders directly from the
  dashboard.

  Note: This component runs on the client because it fetches data with
  `useEffect`. Ensure that your Supabase credentials are exposed via
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
  as described in the Supabase Next.js quickstart【891684312562047†L247-L272】.
*/
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Flame, Users, ShoppingCart, Plus } from 'lucide-react'
import OrderModal from './components/OrderModal'

interface Stats {
  caskets: { total: number; lowStock: number; backordered: number }
  urns: { total: number; lowStock: number; backordered: number }
  orders: { total: number; urgent: number }
  suppliers: number
}

interface Order {
  id: number
  type: 'casket' | 'urn' | 'special'
  name: string
  supplier?: string
  family_name?: string
  deceased_name?: string
  expected_date: string
  service_date?: string
  urgency: 'on-time' | 'urgent' | 'late'
  days_remaining: number
  po_number?: string
}

export default function Dashboard() {
  // State for dashboard stats and orders
  const [stats, setStats] = useState<Stats>({
    caskets: { total: 0, lowStock: 0, backordered: 0 },
    urns: { total: 0, lowStock: 0, backordered: 0 },
    orders: { total: 0, urgent: 0 },
    suppliers: 0,
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderType, setOrderType] = useState<'casket' | 'urn'>('casket')

  useEffect(() => {
    // Load statistics and active orders once on mount
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch casket statistics
      const { data: casketsData } = await supabase
        .from('caskets')
        .select('on_hand, on_order, target_quantity, backordered_quantity')
      const casketsTotal = casketsData?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const casketsLowStock = casketsData?.filter(
        (item) => item.on_hand + item.on_order < item.target_quantity
      ).length || 0
      const casketsBackordered = casketsData?.reduce(
        (sum, item) => sum + (item.backordered_quantity || 0),
        0
      ) || 0

      // Fetch urn statistics
      const { data: urnsData } = await supabase
        .from('urns')
        .select('on_hand, on_order, target_quantity, backordered_quantity')
      const urnsTotal = urnsData?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const urnsLowStock = urnsData?.filter(
        (item) => item.on_hand + item.on_order < item.target_quantity
      ).length || 0
      const urnsBackordered = urnsData?.reduce(
        (sum, item) => sum + (item.backordered_quantity || 0),
        0
      ) || 0

      // Fetch supplier count
      const { data: suppliersData } = await supabase
        .from('suppliers_list')
        .select('id')
      const suppliersCount = suppliersData?.length || 0

      // Fetch active orders from caskets
      const { data: casketOrders } = await supabase
        .from('casket_orders')
        .select(`id, expected_date, deceased_name, po_number, caskets(name, supplier)`)
        .neq('status', 'arrived')

      // Fetch active orders from urns
      const { data: urnOrders } = await supabase
        .from('urn_orders')
        .select(`id, expected_date, deceased_name, po_number, urns(name, supplier)`)
        .neq('status', 'arrived')

      // Fetch active special orders
      const { data: specialOrders } = await supabase
        .from('special_orders')
        .select('*')
        .neq('status', 'arrived')

      // Consolidate orders into a unified array with urgency and days remaining
      const allOrders: Order[] = []
      casketOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil(
          (new Date(order.expected_date).getTime() - Date.now()) / 86400000
        )
        const urgency: 'on-time' | 'urgent' | 'late' =
          daysRemaining < 0 ? 'late' : daysRemaining <= 3 ? 'urgent' : 'on-time'
        allOrders.push({
          id: order.id,
          type: 'casket',
          name: order.caskets?.name || 'Unknown Casket',
          supplier: order.caskets?.supplier,
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number,
        })
      })
      urnOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil(
          (new Date(order.expected_date).getTime() - Date.now()) / 86400000
        )
        const urgency: 'on-time' | 'urgent' | 'late' =
          daysRemaining < 0 ? 'late' : daysRemaining <= 3 ? 'urgent' : 'on-time'
        allOrders.push({
          id: order.id,
          type: 'urn',
          name: order.urns?.name || 'Unknown Urn',
          supplier: order.urns?.supplier,
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number,
        })
      })
      specialOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil(
          (new Date(order.service_date).getTime() - Date.now()) / 86400000
        )
        const urgency: 'on-time' | 'urgent' | 'late' =
          daysRemaining < 0 ? 'late' : daysRemaining <= 7 ? 'urgent' : 'on-time'
        allOrders.push({
          id: order.id,
          type: 'special',
          name: order.casket_name,
          supplier: order.supplier,
          family_name: order.family_name,
          expected_date: order.expected_delivery || order.service_date,
          service_date: order.service_date,
          urgency,
          days_remaining: daysRemaining,
        })
      })
      allOrders.sort((a, b) => {
        const rank = { late: 3, urgent: 2, 'on-time': 1 } as const
        return rank[b.urgency] - rank[a.urgency] || a.days_remaining - b.days_remaining
      })

      setOrders(allOrders)
      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock, backordered: casketsBackordered },
        urns: { total: urnsTotal, lowStock: urnsLowStock, backordered: urnsBackordered },
        orders: { total: allOrders.length, urgent: allOrders.filter(o => o.urgency !== 'on-time').length },
        suppliers: suppliersCount,
      })
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helpers to generate class names for order type and urgency
  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'casket':
        return 'border-sky-400'
      case 'urn':
        return 'border-violet-400'
      case 'special':
        return 'border-emerald-400'
      default:
        return 'border-slate-400'
    }
  }
  const getUrgencyBg = (urgency: string) => {
    switch (urgency) {
      case 'late':
        return 'bg-red-100/40'
      case 'urgent':
        return 'bg-amber-100/40'
      default:
        return 'bg-emerald-100/40'
    }
  }

  // Render loading state
  if (loading) {
    return <div className="text-center text-gray-600">Loading...</div>
  }

  return (
    <div className="space-y-8">
      {/* Top statistics grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Caskets */}
        <div className="relative flex flex-col justify-between rounded-xl p-6 backdrop-blur-md bg-white/40 shadow-lg ring-1 ring-white/20 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-sky-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-600">Caskets</h3>
          </div>
          <div className="mt-4 text-4xl font-bold text-gray-900">{stats.caskets.total}</div>
          {(stats.caskets.lowStock > 0 || stats.caskets.backordered > 0) && (
            <div className="mt-2 text-sm text-gray-700">
              {stats.caskets.lowStock > 0 && `${stats.caskets.lowStock} low`}
              {stats.caskets.lowStock > 0 && stats.caskets.backordered > 0 && ', '}
              {stats.caskets.backordered > 0 && `${stats.caskets.backordered} backordered`}
            </div>
          )}
        </div>
        {/* Urns */}
        <div className="relative flex flex-col justify-between rounded-xl p-6 backdrop-blur-md bg-white/40 shadow-lg ring-1 ring-white/20 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-violet-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-600">Urns</h3>
          </div>
          <div className="mt-4 text-4xl font-bold text-gray-900">{stats.urns.total}</div>
          {(stats.urns.lowStock > 0 || stats.urns.backordered > 0) && (
            <div className="mt-2 text-sm text-gray-700">
              {stats.urns.lowStock > 0 && `${stats.urns.lowStock} low`}
              {stats.urns.lowStock > 0 && stats.urns.backordered > 0 && ', '}
              {stats.urns.backordered > 0 && `${stats.urns.backordered} backordered`}
            </div>
          )}
        </div>
        {/* Active orders */}
        <div className="relative flex flex-col justify-between rounded-xl p-6 backdrop-blur-md bg-white/40 shadow-lg ring-1 ring-white/20 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-amber-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-600">Active Orders</h3>
          </div>
          <div className="mt-4 text-4xl font-bold text-gray-900">{stats.orders.total}</div>
          {stats.orders.urgent > 0 && (
            <div className="mt-2 text-sm text-gray-700">{stats.orders.urgent} urgent</div>
          )}
        </div>
        {/* Suppliers */}
        <div className="relative flex flex-col justify-between rounded-xl p-6 backdrop-blur-md bg-white/40 shadow-lg ring-1 ring-white/20 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Suppliers</h3>
          </div>
          <div className="mt-4 text-4xl font-bold text-gray-900">{stats.suppliers}</div>
        </div>
      </div>

      {/* Active orders list */}
      <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Active Orders ({orders.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.slice(0, 12).map((order) => (
              <div
                key={order.id}
                className={
                  `relative overflow-hidden rounded-xl p-4 backdrop-blur-md bg-white/30 ring-1 ring-white/20 shadow-md transition-transform hover:-translate-y-1 ${getUrgencyBg(order.urgency)} ${getOrderTypeColor(order.type)}`
                }
                style={{ borderLeftWidth: '4px' }}
              >
                <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <span>{order.type}</span>
                  <span>
                    {order.urgency === 'late' ? 'LATE' : order.urgency === 'urgent' ? 'URGENT' : 'ON TIME'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{order.name}</h3>
                {order.supplier && (
                  <p className="text-sm text-gray-600">{order.supplier}</p>
                )}
                {order.po_number && (
                  <p className="text-sm text-gray-600">PO: {order.po_number}</p>
                )}
                <p className="mt-2 text-sm text-gray-700">
                  {order.family_name || order.deceased_name}
                  {' \u2022 '}
                  {order.service_date ? `Service: ${order.service_date}` : `Expected: ${order.expected_date}`}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {order.days_remaining < 0
                    ? `${Math.abs(order.days_remaining)}d overdue`
                    : `${order.days_remaining}d left`}
                </p>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-gray-600">No active orders</p>
            )}
          </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => {
            setOrderType('casket')
            setShowOrderModal(true)
          }}
          className="flex items-center justify-between rounded-xl p-4 text-white shadow-md transition-transform hover:-translate-y-1 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
        >
          <span className="font-semibold">Order Casket</span>
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            setOrderType('urn')
            setShowOrderModal(true)
          }}
          className="flex items-center justify-between rounded-xl p-4 text-white shadow-md transition-transform hover:-translate-y-1 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
        >
          <span className="font-semibold">Order Urn</span>
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            // default to casket type for special order; order modal can handle special type later
            setOrderType('casket')
            setShowOrderModal(true)
          }}
          className="flex items-center justify-between rounded-xl p-4 text-white shadow-md transition-transform hover:-translate-y-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
        >
          <span className="font-semibold">Special Order</span>
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Order modal */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        itemType={orderType}
        onSuccess={loadData}
      />
    </div>
  )
}