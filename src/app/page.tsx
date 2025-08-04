'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Flame, Users, ShoppingCart, Plus, AlertTriangle, Search, TrendingUp, Calendar, Clock, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InventoryStats {
  caskets: { total: number; lowStock: number; backordered: number }
  urns: { total: number; lowStock: number }
  suppliers: number
  orders: { pending: number; total: number }
  specialOrders: { urgent: number; total: number }
}

interface SpecialOrder {
  id: number
  casket_name: string
  family_name: string
  service_date: string
  status: string
}

interface Supplier {
  id: number
  name: string
  ordering_instructions: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    caskets: { total: 0, lowStock: 0, backordered: 0 },
    urns: { total: 0, lowStock: 0 },
    suppliers: 0,
    orders: { pending: 0, total: 0 },
    specialOrders: { urgent: 0, total: 0 }
  })
  const [urgentSpecialOrders, setUrgentSpecialOrders] = useState<SpecialOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSpecialOrderModal, setShowSpecialOrderModal] = useState(false)
  
  const [specialOrderData, setSpecialOrderData] = useState({
    casket_name: '',
    model: '',
    supplier_id: '',
    custom_supplier: '',
    family_name: '',
    service_date: '',
    expected_delivery: '',
    notes: '',
    urgency_level: 'normal'
  })

  useEffect(() => {
    loadDashboardStats()
    loadSuppliers()
  }, [])

  const loadDashboardStats = async () => {
    try {
      // Get caskets stats with backorders
      const { data: caskets } = await supabase
        .from('caskets')
        .select('on_hand, target_quantity, backordered_quantity')
      
      const casketsTotal = caskets?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const casketsLowStock = caskets?.filter(item => 
        (item.on_hand + (item.backordered_quantity || 0)) < item.target_quantity
      ).length || 0
      const casketsBackordered = caskets?.reduce((sum, item) => sum + (item.backordered_quantity || 0), 0) || 0

      // Get urns stats
      const { data: urns } = await supabase.from('urns').select('quantity')
      const urnsTotal = urns?.reduce((sum, item) => sum + item.quantity, 0) || 0
      const urnsLowStock = urns?.filter(item => item.quantity < 5).length || 0

      // Get suppliers count
      const { data: suppliers } = await supabase.from('suppliers').select('id')
      const suppliersCount = suppliers?.length || 0

      // Get orders stats
      const { data: orders } = await supabase.from('casket_orders').select('status')
      const ordersTotal = orders?.length || 0
      const ordersPending = orders?.filter(order => order.status === 'pending').length || 0

      // Get special orders stats
      const { data: specialOrders } = await supabase
        .from('special_orders')
        .select('*')
        .neq('status', 'arrived')
      
      const specialOrdersTotal = specialOrders?.length || 0
      
      // Calculate urgent special orders (within 7 days)
      const urgentOrders = specialOrders?.filter(order => {
        const daysUntilService = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        return daysUntilService <= 7 && order.status !== 'arrived'
      }) || []

      setUrgentSpecialOrders(urgentOrders.slice(0, 5)) // Show top 5 urgent orders
      
      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock, backordered: casketsBackordered },
        urns: { total: urnsTotal, lowStock: urnsLowStock },
        suppliers: suppliersCount,
        orders: { pending: ordersPending, total: ordersTotal },
        specialOrders: { urgent: urgentOrders.length, total: specialOrdersTotal }
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
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

  const handleSpecialOrder = async () => {
    if (!specialOrderData.casket_name || !specialOrderData.family_name || !specialOrderData.service_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedSupplier = suppliers.find(s => s.id === parseInt(specialOrderData.supplier_id))
      const finalSupplier = selectedSupplier ? selectedSupplier.name : specialOrderData.custom_supplier

      // Calculate urgency based on service date
      const daysUntilService = Math.ceil((new Date(specialOrderData.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      let urgencyLevel = 'normal'
      if (daysUntilService <= 3) urgencyLevel = 'critical'
      else if (daysUntilService <= 7) urgencyLevel = 'urgent'

      const { error } = await supabase
        .from('special_orders')
        .insert([{
          casket_name: specialOrderData.casket_name,
          model: specialOrderData.model,
          supplier: finalSupplier,
          family_name: specialOrderData.family_name,
          service_date: specialOrderData.service_date,
          expected_delivery: specialOrderData.expected_delivery,
          notes: specialOrderData.notes,
          urgency_level: urgencyLevel
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
        notes: '',
        urgency_level: 'normal'
      })
      setShowSpecialOrderModal(false)
      loadDashboardStats()
      alert('Special order created successfully!')
    } catch (error) {
      console.error('Error creating special order:', error)
      alert('Error creating special order. Please try again.')
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
        
        {/* Alert Section - Enhanced with Backorders */}
        {(stats.caskets.lowStock > 0 || stats.caskets.backordered > 0 || stats.specialOrders.urgent > 0) && (
          <div className="space-y-4 mb-8">
            {/* Backorder Alert */}
            {stats.caskets.backordered > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>Backorder Alert:</strong> {stats.caskets.backordered} caskets are currently backordered and not counting toward inventory targets.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Low Stock Alert */}
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

            {/* Urgent Special Orders Alert */}
            {stats.specialOrders.urgent > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                <div className="flex">
                  <Clock className="h-5 w-5 text-purple-400" />
                  <div className="ml-3">
                    <p className="text-sm text-purple-700">
                      <strong>Urgent Special Orders:</strong> {stats.specialOrders.urgent} special orders need attention (service within 7 days).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          
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
                <p className="text-sm font-medium text-slate-600">Pending Orders</p>
                <p className="text-3xl font-bold text-slate-900">{stats.orders.pending}</p>
                <p className="text-sm text-slate-500 mt-1">{stats.orders.total} total</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4">
              <Link href="/orders" className="text-sm text-orange-600 hover:text-orange-800">View Orders</Link>
            </div>
          </div>

          {/* Special Orders Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Special Orders</p>
                <p className="text-3xl font-bold text-slate-900">{stats.specialOrders.total}</p>
                {stats.specialOrders.urgent > 0 && (
                  <p className="text-sm text-red-600 mt-1">{stats.specialOrders.urgent} urgent</p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4 flex space-x-2">
              <Link href="/special-orders" className="text-sm text-purple-600 hover:text-purple-800">View All</Link>
              <button 
                onClick={() => setShowSpecialOrderModal(true)}
                className="text-sm text-green-600 hover:text-green-800"
              >
                + New Order
              </button>
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
              <Link href="/suppliers" className="text-sm text-green-600 hover:text-green-800">Manage</Link>
            </div>
          </div>
        </div>

        {/* Urgent Special Orders Section */}
        {urgentSpecialOrders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Urgent Special Orders</h3>
              <Link href="/special-orders" className="text-sm text-purple-600 hover:text-purple-800">View All</Link>
            </div>
            <div className="space-y-3">
              {urgentSpecialOrders.map((order) => {
                const daysUntilService = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                return (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{order.casket_name} - {order.family_name}</p>
                      <p className="text-sm text-slate-600">Service: {order.service_date}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        daysUntilService <= 1 ? 'bg-red-100 text-red-800' :
                        daysUntilService <= 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {daysUntilService <= 0 ? 'TODAY' : `${daysUntilService} days`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Caskets Management */}
          <Link href="/caskets" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Package className="h-10 w-10 text-blue-600" />
                <TrendingUp className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Caskets Management</h3>
              <p className="text-slate-600 text-sm mb-4">Manage casket inventory, pricing, and locations</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">{stats.caskets.total}</span>
                <span className="text-sm text-slate-500">in stock</span>
              </div>
              {stats.caskets.backordered > 0 && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  {stats.caskets.backordered} backordered
                </div>
              )}
            </div>
          </Link>

          {/* Special Orders */}
          <button onClick={() => setShowSpecialOrderModal(true)} className="group text-left">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="h-10 w-10 text-purple-600" />
                <Plus className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Create Special Order</h3>
              <p className="text-slate-600 text-sm mb-4">Order custom caskets for specific families</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-purple-600">{stats.specialOrders.total}</span>
                <span className="text-sm text-slate-500">active orders</span>
              </div>
            </div>
          </button>

          {/* Suppliers */}
          <Link href="/suppliers" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-10 w-10 text-green-600" />
                <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Suppliers</h3>
              <p className="text-slate-600 text-sm mb-4">Manage supplier contacts and relationships</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">{stats.suppliers}</span>
                <span className="text-sm text-slate-500">suppliers</span>
              </div>
            </div>
          </Link>

        </div>
      </main>

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
    </div>
  )
}