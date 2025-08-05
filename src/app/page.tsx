'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Flame, Users, ShoppingCart, Plus, AlertTriangle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
  const [stats, setStats] = useState<Stats>({
    caskets: { total: 0, lowStock: 0, backordered: 0 },
    urns: { total: 0, lowStock: 0, backordered: 0 },
    orders: { total: 0, urgent: 0 },
    suppliers: 0
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderType, setOrderType] = useState<'casket' | 'urn'>('casket')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get caskets stats
      const { data: caskets } = await supabase
        .from('caskets')
        .select('on_hand, on_order, target_quantity, backordered_quantity')

      const casketsTotal = caskets?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const casketsLowStock = caskets?.filter(item =>
        (item.on_hand + item.on_order) < item.target_quantity
      ).length || 0
      const casketsBackordered = caskets?.reduce((sum, item) => sum + (item.backordered_quantity || 0), 0) || 0

      // Get urns stats
      const { data: urns } = await supabase
        .from('urns')
        .select('on_hand, on_order, target_quantity, backordered_quantity')

      const urnsTotal = urns?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const urnsLowStock = urns?.filter(item =>
        (item.on_hand + item.on_order) < item.target_quantity
      ).length || 0
      const urnsBackordered = urns?.reduce((sum, item) => sum + (item.backordered_quantity || 0), 0) || 0

      // Get suppliers count
      const { data: suppliersData } = await supabase.from('suppliers_list').select('id')
      const suppliersCount = suppliersData?.length || 0

      // Get all orders
      const { data: casketOrders } = await supabase
        .from('casket_orders')
        .select(`id, quantity, expected_date, deceased_name, status, po_number, caskets(name, supplier)`)
        .neq('status', 'arrived')

      const { data: urnOrders } = await supabase
        .from('urn_orders')
        .select(`id, quantity, expected_date, deceased_name, status, po_number, urns(name, supplier)`)
        .neq('status', 'arrived')

      const { data: specialOrders } = await supabase
        .from('special_orders')
        .select('*')
        .neq('status', 'arrived')

      // Process orders
      const allOrders: Order[] = []

      casketOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        allOrders.push({
          id: order.id,
          type: 'casket',
          name: order.caskets?.name || 'Unknown Casket',
          supplier: order.caskets?.supplier,
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number
        })
      })

      urnOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        allOrders.push({
          id: order.id,
          type: 'urn',
          name: order.urns?.name || 'Unknown Urn',
          supplier: order.urns?.supplier,
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number
        })
      })

      specialOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 7) urgency = 'urgent'

        allOrders.push({
          id: order.id,
          type: 'special',
          name: order.casket_name,
          supplier: order.supplier,
          family_name: order.family_name,
          expected_date: order.expected_delivery || order.service_date,
          service_date: order.service_date,
          urgency,
          days_remaining: daysRemaining
        })
      })

      allOrders.sort((a, b) => {
        if (a.urgency === 'late' && b.urgency !== 'late') return -1
        if (b.urgency === 'late' && a.urgency !== 'late') return 1
        if (a.urgency === 'urgent' && b.urgency === 'on-time') return -1
        if (b.urgency === 'urgent' && a.urgency === 'on-time') return 1
        return a.days_remaining - b.days_remaining
      })

      setOrders(allOrders)

      const urgentOrders = allOrders.filter(order => order.urgency === 'urgent' || order.urgency === 'late').length

      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock, backordered: casketsBackordered },
        urns: { total: urnsTotal, lowStock: urnsLowStock, backordered: urnsBackordered },
        orders: { total: allOrders.length, urgent: urgentOrders },
        suppliers: suppliersCount
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'casket': return 'bg-sky-50 text-sky-700'
      case 'urn': return 'bg-violet-50 text-violet-700'
      case 'special': return 'bg-emerald-50 text-emerald-700'
      default: return 'bg-slate-50 text-slate-700'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'late': return 'border-l-red-400 bg-red-50'
      case 'urgent': return 'border-l-amber-400 bg-amber-50'
      default: return 'border-l-emerald-400 bg-emerald-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Sol Levinson</h1>
              <p className="text-slate-600">Inventory Management</p>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setOrderType('casket')
                  setShowOrderModal(true)
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Order Casket
              </button>
              <button
                onClick={() => {
                  setOrderType('urn')
                  setShowOrderModal(true)
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Order Urn
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Alerts */}
        {(stats.caskets.lowStock > 0 || stats.caskets.backordered > 0 || stats.urns.lowStock > 0 || stats.urns.backordered > 0) && (
          <div className="mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    {stats.caskets.lowStock + stats.urns.lowStock > 0 && (
                      <span className="font-medium">Low Stock: </span>
                    )}
                    {stats.caskets.lowStock > 0 && <span>{stats.caskets.lowStock} caskets </span>}
                    {stats.urns.lowStock > 0 && <span>{stats.urns.lowStock} urns </span>}
                    {(stats.caskets.backordered > 0 || stats.urns.backordered > 0) && (
                      <span className="font-medium ml-4">Backordered: </span>
                    )}
                    {stats.caskets.backordered > 0 && <span>{stats.caskets.backordered} caskets </span>}
                    {stats.urns.backordered > 0 && <span>{stats.urns.backordered} urns</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/caskets" className="group">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Caskets</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.caskets.total}</p>
                  {(stats.caskets.lowStock > 0 || stats.caskets.backordered > 0) && (
                    <p className="text-xs text-amber-600 mt-1">
                      {stats.caskets.lowStock > 0 ? `${stats.caskets.lowStock} low` : ''}
                      {stats.caskets.lowStock > 0 && stats.caskets.backordered > 0 ? ', ' : ''}
                      {stats.caskets.backordered > 0 ? `${stats.caskets.backordered} backordered` : ''}
                    </p>
                  )}
                </div>
                <Package className="h-8 w-8 text-sky-600" />
              </div>
            </div>
          </Link>

          <Link href="/urns" className="group">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Urns</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.urns.total}</p>
                  {(stats.urns.lowStock > 0 || stats.urns.backordered > 0) && (
                    <p className="text-xs text-amber-600 mt-1">
                      {stats.urns.lowStock > 0 ? `${stats.urns.lowStock} low` : ''}
                      {stats.urns.lowStock > 0 && stats.urns.backordered > 0 ? ', ' : ''}
                      {stats.urns.backordered > 0 ? `${stats.urns.backordered} backordered` : ''}
                    </p>
                  )}
                </div>
                <Flame className="h-8 w-8 text-violet-600" />
              </div>
            </div>
          </Link>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Orders</p>
                <p className="text-2xl font-bold text-slate-900">{stats.orders.total}</p>
                {stats.orders.urgent > 0 && (
                  <p className="text-xs text-red-600 mt-1">{stats.orders.urgent} urgent</p>
                )}
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <Link href="/suppliers" className="group">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Suppliers</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.suppliers}</p>
                </div>
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Active Orders - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Orders ({orders.length})</h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.slice(0, 12).map((order) => (
                  <div
                    key={`${order.type}-${order.id}`}
                    className={`border-l-4 p-4 rounded-r ${getUrgencyColor(order.urgency)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getOrderTypeColor(order.type)}`}>
                            {order.type.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${order.urgency === 'late' ? 'bg-red-100 text-red-800' :
                              order.urgency === 'urgent' ? 'bg-amber-100 text-amber-800' :
                                'bg-emerald-100 text-emerald-800'
                            }`}>
                            {order.urgency === 'late' ? 'LATE' :
                              order.urgency === 'urgent' ? 'URGENT' : 'ON TIME'}
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 truncate">{order.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          {order.supplier && <span>{order.supplier}</span>}
                          {order.po_number && <span>PO: {order.po_number}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {order.family_name || order.deceased_name} •
                          {order.service_date ? ` Service: ${order.service_date}` : ` Expected: ${order.expected_date}`}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-slate-900">
                          {order.days_remaining < 0 ?
                            `${Math.abs(order.days_remaining)}d overdue` :
                            `${order.days_remaining}d left`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No active orders
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions - Takes 1 column */}
          <div className="space-y-6">

            {/* Special Orders */}
            <Link href="/special-orders" className="block group">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 hover:shadow-md transition-all p-6">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="h-8 w-8 text-emerald-600" />
                  <div className="text-right">
                    <span className="text-xl font-bold text-emerald-600">
                      {orders.filter(o => o.type === 'special').length}
                    </span>
                    <p className="text-xs text-slate-500">active</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Special Orders</h3>
                <p className="text-slate-600 text-sm">Custom items for families</p>
              </div>
            </Link>

            {/* Quick Order Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setOrderType('casket')
                  setShowOrderModal(true)
                }}
                className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white p-4 rounded-xl flex items-center justify-between shadow-sm transition-all"
              >
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-3" />
                  <span className="font-medium">Order Casket</span>
                </div>
                <Plus className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  setOrderType('urn')
                  setShowOrderModal(true)
                }}
                className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white p-4 rounded-xl flex items-center justify-between shadow-sm transition-all"
              >
                <div className="flex items-center">
                  <Flame className="h-5 w-5 mr-3" />
                  <span className="font-medium">Order Urn</span>
                </div>
                <Plus className="h-5 w-5" />
              </button>

              <Link
                href="/special-orders"
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-4 rounded-xl flex items-center justify-between shadow-sm transition-all"
              >
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3" />
                  <span className="font-medium">Special Order</span>
                </div>
                <Plus className="h-5 w-5" />
              </Link>
            </div>

            {/* Management Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/caskets" className="bg-white/50 hover:bg-white/70 border border-slate-200 rounded-lg p-3 text-center transition-colors">
                <Package className="h-6 w-6 text-sky-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-slate-700">Manage Caskets</p>
              </Link>

              <Link href="/urns" className="bg-white/50 hover:bg-white/70 border border-slate-200 rounded-lg p-3 text-center transition-colors">
                <Flame className="h-6 w-6 text-violet-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-slate-700">Manage Urns</p>
              </Link>
            </div>

          </div>
        </div>
      </main>

      {/* Centralized Order Modal */}
      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        itemType={orderType}
        onSuccess={loadData}
      />
    </div>
  )
}