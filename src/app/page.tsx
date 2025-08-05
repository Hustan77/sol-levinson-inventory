'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Flame, Users, ShoppingCart, Plus, AlertTriangle, Search, TrendingUp, Calendar, ExternalLink, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InventoryStats {
  caskets: { total: number; lowStock: number; backordered: number }
  urns: { total: number; lowStock: number; backordered: number }
  suppliers: number
  orders: { pending: number; total: number }
  specialOrders: { urgent: number; total: number }
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
  status: string
  urgency: 'on-time' | 'urgent' | 'late'
  days_remaining: number
  po_number?: string
}

interface Supplier {
  id: number
  name: string
  ordering_instructions: string
}

interface Casket {
  id: number
  name: string
  supplier: string
  supplier_instructions: string
  on_hand: number
}

interface Urn {
  id: number
  name: string
  supplier: string
  supplier_instructions: string
  on_hand: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    caskets: { total: 0, lowStock: 0, backordered: 0 },
    urns: { total: 0, lowStock: 0, backordered: 0 },
    suppliers: 0,
    orders: { pending: 0, total: 0 },
    specialOrders: { urgent: 0, total: 0 }
  })

  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [urns, setUrns] = useState<Urn[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showSpecialOrderModal, setShowSpecialOrderModal] = useState(false)
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<'casket' | 'urn'>('casket')

  // Form states
  const [orderData, setOrderData] = useState({
    item_id: '',
    deceased_name: '',
    expected_date: '',
    po_number: '',
    is_backordered: false
  })

  const [specialOrderData, setSpecialOrderData] = useState({
    item_name: '',
    item_type: 'casket' as 'casket' | 'urn',
    model: '',
    supplier_id: '',
    custom_supplier: '',
    family_name: '',
    service_date: '',
    expected_delivery: '',
    notes: ''
  })

  useEffect(() => {
    loadDashboardData()
    loadSuppliers()
    loadItems()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get caskets stats (including on_order in total)
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

      // Get casket orders
      const { data: casketOrders } = await supabase
        .from('casket_orders')
        .select(`
          id, quantity, expected_date, deceased_name, status, po_number,
          caskets(name, supplier)
        `)
        .neq('status', 'arrived')

      // Get urn orders
      const { data: urnOrders } = await supabase
        .from('urn_orders')
        .select(`
          id, quantity, expected_date, deceased_name, status, po_number,
          urns(name, supplier)
        `)
        .neq('status', 'arrived')

      // Get special orders
      const { data: specialOrders } = await supabase
        .from('special_orders')
        .select('*')
        .neq('status', 'arrived')

      // Combine and process all orders
      const combinedOrders: Order[] = []

      // Process casket orders
      casketOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'

        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        combinedOrders.push({
          id: order.id,
          type: 'casket',
          name: order.caskets?.name || 'Unknown Casket',
          supplier: order.caskets?.supplier || 'Unknown Supplier',
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          status: order.status,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number
        })
      })

      // Process urn orders
      urnOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'

        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        combinedOrders.push({
          id: order.id,
          type: 'urn',
          name: order.urns?.name || 'Unknown Urn',
          supplier: order.urns?.supplier || 'Unknown Supplier',
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          status: order.status,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number
        })
      })

      // Process special orders
      specialOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'

        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 7) urgency = 'urgent'

        combinedOrders.push({
          id: order.id,
          type: 'special',
          name: order.casket_name,
          supplier: order.supplier,
          family_name: order.family_name,
          expected_date: order.expected_delivery || order.service_date,
          service_date: order.service_date,
          status: order.status,
          urgency,
          days_remaining: daysRemaining
        })
      })

      // Sort by urgency and days remaining
      combinedOrders.sort((a, b) => {
        if (a.urgency === 'late' && b.urgency !== 'late') return -1
        if (b.urgency === 'late' && a.urgency !== 'late') return 1
        if (a.urgency === 'urgent' && b.urgency === 'on-time') return -1
        if (b.urgency === 'urgent' && a.urgency === 'on-time') return 1
        return a.days_remaining - b.days_remaining
      })

      setAllOrders(combinedOrders)

      const ordersTotal = (casketOrders?.length || 0) + (urnOrders?.length || 0)
      const ordersPending = combinedOrders.filter(order => order.status === 'pending').length
      const specialOrdersTotal = specialOrders?.length || 0
      const urgentSpecialOrders = specialOrders?.filter((order: any) => {
        const days = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        return days <= 7
      }).length || 0

      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock, backordered: casketsBackordered },
        urns: { total: urnsTotal, lowStock: urnsLowStock, backordered: urnsBackordered },
        suppliers: suppliersCount,
        orders: { pending: ordersPending, total: ordersTotal },
        specialOrders: { urgent: urgentSpecialOrders, total: specialOrdersTotal }
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const { data } = await supabase
        .from('suppliers_list')
        .select('*')
        .order('name')

      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  const loadItems = async () => {
    try {
      // Load caskets
      const { data: casketsData } = await supabase
        .from('caskets')
        .select('id, name, supplier, supplier_instructions, on_hand')
        .gt('on_hand', 0)
        .order('name')

      setCaskets(casketsData || [])

      // Load urns
      const { data: urnsData } = await supabase
        .from('urns')
        .select('id, name, supplier, supplier_instructions, on_hand')
        .gt('on_hand', 0)
        .order('name')

      setUrns(urnsData || [])
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  const handleRegularOrder = async () => {
    if (!orderData.item_id || !orderData.deceased_name || !orderData.po_number) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedItem = selectedItemType === 'casket'
        ? caskets.find(c => c.id === parseInt(orderData.item_id))
        : urns.find(u => u.id === parseInt(orderData.item_id))

      if (!selectedItem) return

      const expectedDelivery = orderData.expected_date ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const table = selectedItemType === 'casket' ? 'casket_orders' : 'urn_orders'
      const itemIdField = selectedItemType === 'casket' ? 'casket_id' : 'urn_id'

      // Create order
      const { error: orderError } = await supabase
        .from(table)
        .insert([{
          [itemIdField]: selectedItem.id,
          order_type: 'replacement',
          quantity: 1,
          expected_date: expectedDelivery,
          deceased_name: orderData.deceased_name,
          po_number: orderData.po_number
        }])

      if (orderError) throw orderError

      // Update inventory
      const inventoryTable = selectedItemType === 'casket' ? 'caskets' : 'urns'
      const updateData = orderData.is_backordered
        ? {
          on_hand: selectedItem.on_hand - 1,
          backordered_quantity: 1,
          backorder_reason: 'Backordered during ordering',
          backorder_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }
        : {
          on_hand: selectedItem.on_hand - 1,
          on_order: 1,
          updated_at: new Date().toISOString()
        }

      const { error: updateError } = await supabase
        .from(inventoryTable)
        .update(updateData)
        .eq('id', selectedItem.id)

      if (updateError) throw updateError

      setOrderData({ item_id: '', deceased_name: '', expected_date: '', po_number: '', is_backordered: false })
      setShowOrderModal(false)
      loadDashboardData()
      loadItems()
      alert('Order placed successfully!')
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Error placing order. Please try again.')
    }
  }

  const handleSpecialOrder = async () => {
    if (!specialOrderData.item_name || !specialOrderData.family_name || !specialOrderData.service_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedSupplier = suppliers.find(s => s.id === parseInt(specialOrderData.supplier_id))
      const finalSupplier = selectedSupplier ? selectedSupplier.name : specialOrderData.custom_supplier

      const { error } = await supabase
        .from('special_orders')
        .insert([{
          casket_name: specialOrderData.item_name,
          item_type: specialOrderData.item_type,
          model: specialOrderData.model,
          supplier: finalSupplier,
          family_name: specialOrderData.family_name,
          service_date: specialOrderData.service_date,
          expected_delivery: specialOrderData.expected_delivery,
          notes: specialOrderData.notes
        }])

      if (error) throw error

      setSpecialOrderData({
        item_name: '',
        item_type: 'casket',
        model: '',
        supplier_id: '',
        custom_supplier: '',
        family_name: '',
        service_date: '',
        expected_delivery: '',
        notes: ''
      })
      setShowSpecialOrderModal(false)
      loadDashboardData()
      alert('Special order created successfully!')
    } catch (error) {
      console.error('Error creating special order:', error)
      alert('Error creating special order. Please try again.')
    }
  }

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'casket': return 'bg-sky-50 text-sky-700 border-sky-200'
      case 'urn': return 'bg-violet-50 text-violet-700 border-violet-200'
      case 'special': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'late': return 'border-l-rose-400 bg-rose-50'
      case 'urgent': return 'border-l-amber-400 bg-amber-50'
      default: return 'border-l-emerald-400 bg-emerald-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading dashboard...</div>
      </div>
    )
  }

  const currentItems = selectedItemType === 'casket' ? caskets : urns

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Sol Levinson</h1>
              <p className="text-slate-600 text-lg">Inventory Management System</p>
            </div>

            {/* Global Search */}
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white/50 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Alert Section */}
        {(stats.caskets.lowStock > 0 || stats.caskets.backordered > 0 || stats.urns.lowStock > 0 || stats.urns.backordered > 0) && (
          <div className="space-y-3 mb-8">
            {(stats.caskets.backordered > 0 || stats.urns.backordered > 0) && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <div className="ml-3">
                    <p className="text-sm text-rose-800">
                      <strong>Backorder Alert:</strong> {stats.caskets.backordered + stats.urns.backordered} items are currently backordered.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(stats.caskets.lowStock > 0 || stats.urns.lowStock > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-800">
                      <strong>Low Stock Alert:</strong> {stats.caskets.lowStock + stats.urns.lowStock} item types are below target levels.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowOrderModal(true)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white p-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Place Order</span>
          </button>

          <button
            onClick={() => setShowSpecialOrderModal(true)}
            className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white p-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <Calendar className="h-5 w-5" />
            <span>Special Order</span>
          </button>

          <Link
            href="/caskets"
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <Package className="h-5 w-5" />
            <span>Manage Inventory</span>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Caskets Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Caskets</p>
                <p className="text-3xl font-bold text-slate-900">{stats.caskets.total}</p>
                {stats.caskets.lowStock > 0 && (
                  <p className="text-sm text-amber-600 mt-1">{stats.caskets.lowStock} low stock</p>
                )}
                {stats.caskets.backordered > 0 && (
                  <p className="text-sm text-rose-600 mt-1">{stats.caskets.backordered} backordered</p>
                )}
              </div>
              <Package className="h-8 w-8 text-sky-600" />
            </div>
            <div className="mt-4">
              <Link href="/caskets" className="text-sm text-sky-600 hover:text-sky-800">Manage Caskets</Link>
            </div>
          </div>

          {/* Urns Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Urns</p>
                <p className="text-3xl font-bold text-slate-900">{stats.urns.total}</p>
                {stats.urns.lowStock > 0 && (
                  <p className="text-sm text-amber-600 mt-1">{stats.urns.lowStock} low stock</p>
                )}
                {stats.urns.backordered > 0 && (
                  <p className="text-sm text-rose-600 mt-1">{stats.urns.backordered} backordered</p>
                )}
              </div>
              <Flame className="h-8 w-8 text-violet-600" />
            </div>
            <div className="mt-4">
              <Link href="/urns" className="text-sm text-violet-600 hover:text-violet-800">Manage Urns</Link>
            </div>
          </div>

          {/* Orders Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Orders</p>
                <p className="text-3xl font-bold text-slate-900">{stats.orders.total + stats.specialOrders.total}</p>
                <p className="text-sm text-slate-500 mt-1">{stats.orders.pending} pending</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4">
              <Link href="/orders" className="text-sm text-orange-600 hover:text-orange-800">View All Orders</Link>
            </div>
          </div>

          {/* Suppliers Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Suppliers</p>
                <p className="text-3xl font-bold text-slate-900">{stats.suppliers}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="mt-4">
              <Link href="/suppliers" className="text-sm text-emerald-600 hover:text-emerald-800">Manage Suppliers</Link>
            </div>
          </div>
        </div>

        {/* Orders and Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Active Orders - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Active Orders ({allOrders.length})</h3>
              <Link href="/orders" className="text-sm text-sky-600 hover:text-sky-800">View All</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {allOrders.slice(0, 20).map((order) => (
                <div
                  key={`${order.type}-${order.id}`}
                  className={`border-l-4 p-3 rounded-r cursor-pointer hover:shadow-md transition-all ${getUrgencyColor(order.urgency)}`}
                  onClick={() => setShowOrderDetail(order)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getOrderTypeColor(order.type)}`}>
                          {order.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${order.urgency === 'late' ? 'bg-rose-100 text-rose-800' :
                            order.urgency === 'urgent' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                          }`}>
                          {order.urgency === 'late' ? 'LATE' :
                            order.urgency === 'urgent' ? 'URGENT' : 'ON TIME'}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 text-sm truncate">{order.name}</p>
                      <p className="text-xs text-slate-600 truncate">
                        {order.supplier && `${order.supplier} • `}
                        {order.family_name || order.deceased_name}
                      </p>
                      {order.po_number && (
                        <p className="text-xs text-slate-500">PO: {order.po_number}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {order.service_date ? `Service: ${order.service_date}` : `Expected: ${order.expected_date}`}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-medium text-slate-900">
                        {order.days_remaining < 0 ?
                          `${Math.abs(order.days_remaining)}d overdue` :
                          `${order.days_remaining}d left`
                        }
                      </p>
                      <Eye className="h-3 w-3 text-slate-400 mt-1 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}

              {allOrders.length === 0 && (
                <div className="col-span-2 text-center py-8 text-slate-500">
                  No active orders
                </div>
              )}
            </div>
          </div>

          {/* Management Links - Takes 1 column */}
          <div className="space-y-4">

            {/* Caskets Management */}
            <Link href="/caskets" className="block group">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <Package className="h-8 w-8 text-sky-600" />
                  <TrendingUp className="h-4 w-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Caskets</h3>
                    <p className="text-slate-600 text-sm">Manage inventory & orders</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-sky-600">{stats.caskets.total}</span>
                    <p className="text-xs text-slate-500">on hand</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Urns Management */}
            <Link href="/urns" className="block group">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <Flame className="h-8 w-8 text-violet-600" />
                  <TrendingUp className="h-4 w-4 text-slate-400 group-hover:text-violet-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Urns</h3>
                    <p className="text-slate-600 text-sm">Manage inventory & orders</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-violet-600">{stats.urns.total}</span>
                    <p className="text-xs text-slate-500">on hand</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Special Orders */}
            <Link href="/special-orders" className="block group">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="h-8 w-8 text-emerald-600" />
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Special Orders</h3>
                    <p className="text-slate-600 text-sm">Custom items for families</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-emerald-600">{stats.specialOrders.total}</span>
                    <p className="text-xs text-slate-500">active</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Suppliers */}
            <Link href="/suppliers" className="block group">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <Users className="h-8 w-8 text-orange-600" />
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Suppliers</h3>
                    <p className="text-slate-600 text-sm">Manage contacts</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-orange-600">{stats.suppliers}</span>
                    <p className="text-xs text-slate-500">suppliers</p>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </main>

      {/* Regular Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Place Order</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Type *</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSelectedItemType('casket')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedItemType === 'casket'
                        ? 'bg-sky-100 text-sky-700 border border-sky-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                  >
                    Casket
                  </button>
                  <button
                    onClick={() => setSelectedItemType('urn')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedItemType === 'urn'
                        ? 'bg-violet-100 text-violet-700 border border-violet-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                  >
                    Urn
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select {selectedItemType.charAt(0).toUpperCase() + selectedItemType.slice(1)} *</label>
                <select
                  value={orderData.item_id}
                  onChange={(e) => setOrderData({ ...orderData, item_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Choose {selectedItemType}</option>
                  {currentItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.on_hand} on hand
                    </option>
                  ))}
                </select>
              </div>

              {orderData.item_id && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                  <h4 className="font-medium text-sky-900 text-sm mb-1">Supplier Instructions:</h4>
                  <p className="text-sm text-sky-800">
                    {currentItems.find(c => c.id === parseInt(orderData.item_id))?.supplier_instructions || 'No instructions available'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  value={orderData.po_number}
                  onChange={(e) => setOrderData({ ...orderData, po_number: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Enter purchase order number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deceased Name *</label>
                <input
                  type="text"
                  value={orderData.deceased_name}
                  onChange={(e) => setOrderData({ ...orderData, deceased_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={orderData.expected_date}
                  onChange={(e) => setOrderData({ ...orderData, expected_date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_backordered"
                  checked={orderData.is_backordered}
                  onChange={(e) => setOrderData({ ...orderData, is_backordered: e.target.checked })}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="is_backordered" className="ml-2 text-sm text-slate-700">
                  Mark as backordered (supplier cannot fulfill immediately)
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleRegularOrder}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg"
              >
                Place Order
              </button>
              <button
                onClick={() => setShowOrderModal(false)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Special Order Modal */}
      {showSpecialOrderModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Create Special Order</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Type *</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSpecialOrderData({ ...specialOrderData, item_type: 'casket' })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${specialOrderData.item_type === 'casket'
                        ? 'bg-sky-100 text-sky-700 border border-sky-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                  >
                    Casket
                  </button>
                  <button
                    onClick={() => setSpecialOrderData({ ...specialOrderData, item_type: 'urn' })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${specialOrderData.item_type === 'urn'
                        ? 'bg-violet-100 text-violet-700 border border-violet-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                  >
                    Urn
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{specialOrderData.item_type.charAt(0).toUpperCase() + specialOrderData.item_type.slice(1)} Name *</label>
                <input
                  type="text"
                  value={specialOrderData.item_name}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, item_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Mahogany Deluxe Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={specialOrderData.model}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, model: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., MD-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <select
                  value={specialOrderData.supplier_id}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, supplier_id: e.target.value, custom_supplier: '' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-2"
                >
                  <option value="">Select existing supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                  <option value="custom">Other (type below)</option>
                </select>

                {specialOrderData.supplier_id === 'custom' && (
                  <input
                    type="text"
                    value={specialOrderData.custom_supplier}
                    onChange={(e) => setSpecialOrderData({ ...specialOrderData, custom_supplier: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="Enter custom supplier name"
                  />
                )}

                {specialOrderData.supplier_id && specialOrderData.supplier_id !== 'custom' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mt-2">
                    <h4 className="font-medium text-sky-900 text-sm mb-1">Ordering Instructions:</h4>
                    <p className="text-sm text-sky-800">
                      {suppliers.find(s => s.id === parseInt(specialOrderData.supplier_id))?.ordering_instructions}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Family Name *</label>
                <input
                  type="text"
                  value={specialOrderData.family_name}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, family_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Date *</label>
                <input
                  type="date"
                  value={specialOrderData.service_date}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, service_date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={specialOrderData.expected_delivery}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, expected_delivery: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={specialOrderData.notes}
                  onChange={(e) => setSpecialOrderData({ ...specialOrderData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Special requirements, color preferences, etc."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSpecialOrder}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-lg"
              >
                Create Special Order
              </button>
              <button
                onClick={() => setShowSpecialOrderModal(false)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Order Details</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getOrderTypeColor(showOrderDetail.type)}`}>
                  {showOrderDetail.type.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${showOrderDetail.urgency === 'late' ? 'bg-rose-100 text-rose-800' :
                    showOrderDetail.urgency === 'urgent' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                  }`}>
                  {showOrderDetail.urgency === 'late' ? 'LATE' :
                    showOrderDetail.urgency === 'urgent' ? 'URGENT' : 'ON TIME'}
                </span>
              </div>

              <div>
                <p className="text-sm text-slate-600">Item</p>
                <p className="font-medium text-slate-900">{showOrderDetail.name}</p>
              </div>

              {showOrderDetail.supplier && (
                <div>
                  <p className="text-sm text-slate-600">Supplier</p>
                  <p className="font-medium text-slate-900">{showOrderDetail.supplier}</p>
                </div>
              )}

              {showOrderDetail.po_number && (
                <div>
                  <p className="text-sm text-slate-600">PO Number</p>
                  <p className="font-medium text-slate-900">{showOrderDetail.po_number}</p>
                </div>
              )}

              {showOrderDetail.family_name && (
                <div>
                  <p className="text-sm text-slate-600">Family</p>
                  <p className="font-medium text-slate-900">{showOrderDetail.family_name}</p>
                </div>
              )}

              {showOrderDetail.deceased_name && (
                <div>
                  <p className="text-sm text-slate-600">Deceased</p>
                  <p className="font-medium text-slate-900">{showOrderDetail.deceased_name}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-600">
                  {showOrderDetail.service_date ? 'Service Date' : 'Expected Delivery'}
                </p>
                <p className="font-medium text-slate-900">
                  {showOrderDetail.service_date || showOrderDetail.expected_date}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Status</p>
                <p className="font-medium text-slate-900 capitalize">{showOrderDetail.status}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600">Time Remaining</p>
                <p className={`font-medium ${showOrderDetail.days_remaining < 0 ? 'text-rose-600' :
                    showOrderDetail.days_remaining <= 3 ? 'text-amber-600' :
                      'text-emerald-600'
                  }`}>
                  {showOrderDetail.days_remaining < 0 ?
                    `${Math.abs(showOrderDetail.days_remaining)} days overdue` :
                    `${showOrderDetail.days_remaining} days remaining`
                  }
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Link
                href={showOrderDetail.type === 'special' ? '/special-orders' : '/orders'}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg text-center"
              >
                View Full Details
              </Link>
              <button
                onClick={() => setShowOrderDetail(null)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}