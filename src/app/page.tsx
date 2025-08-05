'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Flame, Users, ShoppingCart, Plus, AlertTriangle, Search, TrendingUp, Calendar, ExternalLink, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InventoryStats {
  caskets: { total: number; lowStock: number; backordered: number }
  urns: { total: number; lowStock: number }
  suppliers: number
  orders: { pending: number; total: number }
  specialOrders: { urgent: number; total: number }
}

interface Order {
  id: number
  type: 'casket' | 'urn' | 'special'
  name: string
  family_name?: string
  deceased_name?: string
  expected_date: string
  service_date?: string
  status: string
  urgency: 'on-time' | 'urgent' | 'late'
  days_remaining: number
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

export default function Dashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    caskets: { total: 0, lowStock: 0, backordered: 0 },
    urns: { total: 0, lowStock: 0 },
    suppliers: 0,
    orders: { pending: 0, total: 0 },
    specialOrders: { urgent: 0, total: 0 }
  })
  
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showSpecialOrderModal, setShowSpecialOrderModal] = useState(false)
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null)
  
  // Form states
  const [orderData, setOrderData] = useState({
    casket_id: '',
    deceased_name: '',
    expected_date: ''
  })
  
  const [specialOrderData, setSpecialOrderData] = useState({
    casket_name: '',
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
    loadCaskets()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get caskets stats
      const { data: caskets } = await supabase
        .from('caskets')
        .select('on_hand, target_quantity, backordered_quantity')
      
      const casketsTotal = caskets?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const casketsLowStock = caskets?.filter(item => 
        (item.on_hand + (item.backordered_quantity || 0)) < item.target_quantity
      ).length || 0
      const casketsBackordered = caskets?.reduce((sum, item) => sum + (item.backordered_quantity || 0), 0) || 0

      // Get urns stats (placeholder - implement when urns table exists)
      const urnsTotal = 0
      const urnsLowStock = 0

      // Get suppliers count
      const { data: suppliersdata } = await supabase.from('suppliers_list').select('id')
      const suppliersCount = suppliersdata?.length || 0

      // Get regular orders
      const { data: casketOrders } = await supabase
        .from('casket_orders')
        .select(`
          id, quantity, expected_date, deceased_name, status,
          caskets(name)
        `)
        .neq('status', 'arrived')
      
      // Get special orders
      const { data: specialOrders } = await supabase
        .from('special_orders')
        .select('*')
        .neq('status', 'arrived')

      // Combine and process all orders
      const combinedOrders: Order[] = []

      // Process regular casket orders
      casketOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        combinedOrders.push({
          id: order.id,
          type: 'casket',
          name: order.caskets?.name || 'Unknown Casket',
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          status: order.status,
          urgency,
          days_remaining: daysRemaining
        })
      })

      // Process special orders
      specialOrders?.forEach(order => {
        const daysRemaining = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 7) urgency = 'urgent'

        combinedOrders.push({
          id: order.id,
          type: 'special',
          name: order.casket_name,
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
      
      const ordersTotal = casketOrders?.length || 0
      const ordersPending = casketOrders?.filter(order => order.status === 'pending').length || 0
      const specialOrdersTotal = specialOrders?.length || 0
      const urgentSpecialOrders = specialOrders?.filter(order => {
        const days = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        return days <= 7
      }).length || 0

      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock, backordered: casketsBackordered },
        urns: { total: urnsTotal, lowStock: urnsLowStock },
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

  const loadCaskets = async () => {
    try {
      const { data } = await supabase
        .from('caskets')
        .select('id, name, supplier, supplier_instructions, on_hand')
        .gt('on_hand', 0)
        .order('name')
      
      setCaskets(data || [])
    } catch (error) {
      console.error('Error loading caskets:', error)
    }
  }

  const handleRegularOrder = async () => {
    if (!orderData.casket_id || !orderData.deceased_name) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedCasket = caskets.find(c => c.id === parseInt(orderData.casket_id))
      if (!selectedCasket) return

      const expectedDelivery = orderData.expected_date || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Create order
      const { error: orderError } = await supabase
        .from('casket_orders')
        .insert([{
          casket_id: selectedCasket.id,
          order_type: 'replacement',
          quantity: 1,
          expected_date: expectedDelivery,
          deceased_name: orderData.deceased_name
        }])

      if (orderError) throw orderError

      // Update inventory
      const { error: updateError } = await supabase
        .from('caskets')
        .update({
          on_hand: selectedCasket.on_hand - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCasket.id)

      if (updateError) throw updateError

      setOrderData({ casket_id: '', deceased_name: '', expected_date: '' })
      setShowOrderModal(false)
      loadDashboardData()
      loadCaskets()
      alert('Order placed successfully!')
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Error placing order. Please try again.')
    }
  }

  const handleSpecialOrder = async () => {
    if (!specialOrderData.casket_name || !specialOrderData.family_name || !specialOrderData.service_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedSupplier = suppliers.find(s => s.id === parseInt(specialOrderData.supplier_id))
      const finalSupplier = selectedSupplier ? selectedSupplier.name : specialOrderData.custom_supplier

      const { error } = await supabase
        .from('special_orders')
        .insert([{
          casket_name: specialOrderData.casket_name,
          model: specialOrderData.model,
          supplier: finalSupplier,
          family_name: specialOrderData.family_name,
          service_date: specialOrderData.service_date,
          expected_delivery: specialOrderData.expected_delivery,
          notes: specialOrderData.notes
        }])

      if (error) throw error

      setSpecialOrderData({
        casket_name: '',
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
      case 'casket': return 'bg-blue-100 text-blue-800'
      case 'urn': return 'bg-purple-100 text-purple-800'
      case 'special': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'late': return 'border-l-red-500 bg-red-50'
      case 'urgent': return 'border-l-amber-500 bg-amber-50'
      default: return 'border-l-green-500 bg-green-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Sol Levinson</h1>
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
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Alert Section */}
        {(stats.caskets.lowStock > 0 || stats.caskets.backordered > 0) && (
          <div className="space-y-4 mb-8">
            {stats.caskets.backordered > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>Backorder Alert:</strong> {stats.caskets.backordered} caskets are currently backordered.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {stats.caskets.lowStock > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      <strong>Low Stock Alert:</strong> {stats.caskets.lowStock} casket types are below target levels.
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
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Place Casket Order</span>
          </button>
          
          <button
            onClick={() => setShowSpecialOrderModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2"
          >
            <Calendar className="h-5 w-5" />
            <span>Create Special Order</span>
          </button>
          
          <Link 
            href="/caskets"
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2"
          >
            <Package className="h-5 w-5" />
            <span>Manage Inventory</span>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Caskets Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Caskets</p>
                <p className="text-3xl font-bold text-slate-900">{stats.caskets.total}</p>
                {stats.caskets.lowStock > 0 && (
                  <p className="text-sm text-amber-600 mt-1">{stats.caskets.lowStock} low stock</p>
                )}
                {stats.caskets.backordered > 0 && (
                  <p className="text-sm text-red-600 mt-1">{stats.caskets.backordered} backordered</p>
                )}
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <Link href="/caskets" className="text-sm text-blue-600 hover:text-blue-800">Manage Caskets</Link>
            </div>
          </div>

          {/* Urns Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Urns</p>
                <p className="text-3xl font-bold text-slate-900">{stats.urns.total}</p>
                {stats.urns.lowStock > 0 && (
                  <p className="text-sm text-amber-600 mt-1">{stats.urns.lowStock} low stock</p>
                )}
              </div>
              <Flame className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4">
              <Link href="/urns" className="text-sm text-purple-600 hover:text-purple-800">Manage Urns</Link>
            </div>
          </div>

          {/* Orders Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Suppliers</p>
                <p className="text-3xl font-bold text-slate-900">{stats.suppliers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4">
              <Link href="/suppliers" className="text-sm text-green-600 hover:text-green-800">Manage Suppliers</Link>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Active Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Active Orders ({allOrders.length})</h3>
              <Link href="/orders" className="text-sm text-blue-600 hover:text-blue-800">View All</Link>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allOrders.slice(0, 10).map((order) => (
                <div 
                  key={`${order.type}-${order.id}`} 
                  className={`border-l-4 p-4 rounded-r cursor-pointer hover:shadow-md transition-shadow ${getUrgencyColor(order.urgency)}`}
                  onClick={() => setShowOrderDetail(order)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getOrderTypeColor(order.type)}`}>
                          {order.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.urgency === 'late' ? 'bg-red-100 text-red-800' :
                          order.urgency === 'urgent' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.urgency === 'late' ? 'LATE' : 
                           order.urgency === 'urgent' ? 'URGENT' : 'ON TIME'}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900">{order.name}</p>
                      <p className="text-sm text-slate-600">
                        {order.family_name || order.deceased_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {order.service_date ? `Service: ${order.service_date}` : `Expected: ${order.expected_date}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {order.days_remaining < 0 ? 
                          `${Math.abs(order.days_remaining)} days overdue` :
                          `${order.days_remaining} days left`
                        }
                      </p>
                      <Eye className="h-4 w-4 text-slate-400 mt-1 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
              
              {allOrders.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No active orders
                </div>
              )}
            </div>
          </div>

          {/* Management Cards */}
          <div className="space-y-6">
            
            {/* Caskets Management */}
            <Link href="/caskets" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Package className="h-10 w-10 text-blue-600" />
                  <TrendingUp className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">Caskets Management</h3>
                    <p className="text-slate-600 text-sm">Manage inventory, pricing, and locations</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">{stats.caskets.total}</span>
                    <p className="text-sm text-slate-500">in stock</p>
                  </div>
                </div>
                {stats.caskets.backordered > 0 && (
                  <div className="mt-2 text-xs text-red-600 font-medium">
                    {stats.caskets.backordered} backordered
                  </div>
                )}
              </div>
            </Link>

            {/* Special Orders */}
            <Link href="/special-orders" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="h-10 w-10 text-purple-600" />
                  <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">Special Orders</h3>
                    <p className="text-slate-600 text-sm">Custom caskets for specific families</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-600">{stats.specialOrders.total}</span>
                    <p className="text-sm text-slate-500">active orders</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Suppliers */}
            <Link href="/suppliers" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-10 w-10 text-green-600" />
                  <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-green-600 transition-colors" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">Suppliers</h3>
                    <p className="text-slate-600 text-sm">Manage supplier contacts and relationships</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">{stats.suppliers}</span>
                    <p className="text-sm text-slate-500">suppliers</p>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </main>

      {/* Regular Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Place Casket Order</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Casket *</label>
                <select
                  value={orderData.casket_id}
                  onChange={(e) => setOrderData({...orderData, casket_id: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Choose a casket</option>
                  {caskets.map(casket => (
                    <option key={casket.id} value={casket.id}>
                      {casket.name} - {casket.on_hand} on hand
                    </option>
                  ))}
                </select>
              </div>
              
              {orderData.casket_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 text-sm mb-1">Supplier Instructions:</h4>
                  <p className="text-sm text-blue-800">
                    {caskets.find(c => c.id === parseInt(orderData.casket_id))?.supplier_instructions || 'No instructions available'}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deceased Name *</label>
                <input
                  type="text"
                  value={orderData.deceased_name}
                  onChange={(e) => setOrderData({...orderData, deceased_name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={orderData.expected_date}
                  onChange={(e) => setOrderData({...orderData, expected_date: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
               />
             </div>
           </div>

           <div className="flex space-x-3 mt-6">
             <button
               onClick={handleRegularOrder}
               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
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
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
           <h3 className="text-xl font-semibold mb-4">Create Special Order</h3>
           
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Casket Name *</label>
               <input
                 type="text"
                 value={specialOrderData.casket_name}
                 onChange={(e) => setSpecialOrderData({...specialOrderData, casket_name: e.target.value})}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2"
                 placeholder="e.g., Mahogany Deluxe Premium"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
               <input
                 type="text"
                 value={specialOrderData.model}
                 onChange={(e) => setSpecialOrderData({...specialOrderData, model: e.target.value})}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2"
                 placeholder="e.g., MD-500"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
               <select
                 value={specialOrderData.supplier_id}
                 onChange={(e) => setSpecialOrderData({...specialOrderData, supplier_id: e.target.value, custom_supplier: ''})}
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
                   onChange={(e) => setSpecialOrderData({...specialOrderData, custom_supplier: e.target.value})}
                   className="w-full border border-slate-300 rounded-lg px-3 py-2"
                   placeholder="Enter custom supplier name"
                 />
               )}
               
               {specialOrderData.supplier_id && specialOrderData.supplier_id !== 'custom' && (
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                   <h4 className="font-medium text-blue-900 text-sm mb-1">Ordering Instructions:</h4>
                   <p className="text-sm text-blue-800">
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
                 onChange={(e) => setSpecialOrderData({...specialOrderData, family_name: e.target.value})}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Service Date *</label>
               <input
                 type="date"
                 value={specialOrderData.service_date}
                 onChange={(e) => setSpecialOrderData({...specialOrderData, service_date: e.target.value})}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
               <input
                 type="date"
                 value={specialOrderData.expected_delivery}
                 onChange={(e) => setSpecialOrderData({...specialOrderData, expected_delivery: e.target.value})}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
               <textarea
                 value={specialOrderData.notes}
                 onChange={(e) => setSpecialOrderData({...specialOrderData, notes: e.target.value})}
                 rows={3}
                 className="w-full border border-slate-300 rounded-lg px-3 py-2"
                 placeholder="Special requirements, color preferences, etc."
               />
             </div>
           </div>

           <div className="flex space-x-3 mt-6">
             <button
               onClick={handleSpecialOrder}
               className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
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
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
           <h3 className="text-xl font-semibold mb-4">Order Details</h3>
           
           <div className="space-y-4">
             <div className="flex items-center space-x-2">
               <span className={`px-3 py-1 rounded text-sm font-medium ${getOrderTypeColor(showOrderDetail.type)}`}>
                 {showOrderDetail.type.toUpperCase()}
               </span>
               <span className={`px-3 py-1 rounded text-sm font-medium ${
                 showOrderDetail.urgency === 'late' ? 'bg-red-100 text-red-800' :
                 showOrderDetail.urgency === 'urgent' ? 'bg-amber-100 text-amber-800' :
                 'bg-green-100 text-green-800'
               }`}>
                 {showOrderDetail.urgency === 'late' ? 'LATE' : 
                  showOrderDetail.urgency === 'urgent' ? 'URGENT' : 'ON TIME'}
               </span>
             </div>
             
             <div>
               <p className="text-sm text-slate-600">Item</p>
               <p className="font-medium text-slate-900">{showOrderDetail.name}</p>
             </div>
             
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
               <p className={`font-medium ${
                 showOrderDetail.days_remaining < 0 ? 'text-red-600' :
                 showOrderDetail.days_remaining <= 3 ? 'text-amber-600' :
                 'text-green-600'
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
               className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center"
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