'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Flame, Users, ShoppingCart, Plus, AlertTriangle, Search, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface InventoryStats {
  caskets: { total: number; lowStock: number }
  urns: { total: number; lowStock: number }
  suppliers: number
  orders: { pending: number; total: number }
}

interface QuickAddItem {
  name: string
  supplier: string
  cost: number
  price: number
  quantity: number
  location: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    caskets: { total: 0, lowStock: 0 },
    urns: { total: 0, lowStock: 0 },
    suppliers: 0,
    orders: { pending: 0, total: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [quickAddData, setQuickAddData] = useState<QuickAddItem>({
    name: '', supplier: '', cost: 0, price: 0, quantity: 0, location: ''
  })

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      // Get caskets stats
      const { data: caskets } = await supabase.from('caskets').select('quantity')
      const casketsTotal = caskets?.reduce((sum, item) => sum + item.quantity, 0) || 0
      const casketsLowStock = caskets?.filter(item => item.quantity < 5).length || 0

      // Get urns stats
      const { data: urns } = await supabase.from('urns').select('quantity')
      const urnsTotal = urns?.reduce((sum, item) => sum + item.quantity, 0) || 0
      const urnsLowStock = urns?.filter(item => item.quantity < 5).length || 0

      // Get suppliers count
      const { data: suppliers } = await supabase.from('suppliers').select('id')
      const suppliersCount = suppliers?.length || 0

      // Get orders stats
      const { data: orders } = await supabase.from('orders').select('status')
      const ordersTotal = orders?.length || 0
      const ordersPending = orders?.filter(order => order.status === 'pending').length || 0

      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock },
        urns: { total: urnsTotal, lowStock: urnsLowStock },
        suppliers: suppliersCount,
        orders: { pending: ordersPending, total: ordersTotal }
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdd = async (type: string) => {
    if (!quickAddData.name) {
      alert('Please enter a name')
      return
    }

    try {
      const table = type === 'casket' ? 'caskets' : 'urns'
      const { error } = await supabase.from(table).insert([{
        name: quickAddData.name,
        supplier: quickAddData.supplier,
        cost: quickAddData.cost,
        price: quickAddData.price,
        quantity: quickAddData.quantity,
        location: quickAddData.location
      }])

      if (error) throw error

      // Reset form and reload stats
      setQuickAddData({ name: '', supplier: '', cost: 0, price: 0, quantity: 0, location: '' })
      setShowQuickAdd('')
      loadDashboardStats()
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item. Please try again.')
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
        {(stats.caskets.lowStock > 0 || stats.urns.lowStock > 0) && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  <strong>Low Stock Alert:</strong> {stats.caskets.lowStock} caskets and {stats.urns.lowStock} urns are running low.
                </p>
              </div>
            </div>
          </div>
        )}

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
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 flex space-x-2">
              <Link href="/caskets" className="text-sm text-blue-600 hover:text-blue-800">View All</Link>
              <button 
                onClick={() => setShowQuickAdd('casket')}
                className="text-sm text-green-600 hover:text-green-800"
              >
                + Quick Add
              </button>
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
            <div className="mt-4 flex space-x-2">
              <Link href="/urns" className="text-sm text-purple-600 hover:text-purple-800">View All</Link>
              <button 
                onClick={() => setShowQuickAdd('urn')}
                className="text-sm text-green-600 hover:text-green-800"
              >
                + Quick Add
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
        </div>

        {/* Quick Add Form */}
        {showQuickAdd && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Quick Add {showQuickAdd.charAt(0).toUpperCase() + showQuickAdd.slice(1)}
              </h3>
              <button 
                onClick={() => setShowQuickAdd('')}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <input
                type="text"
                placeholder="Name *"
                value={quickAddData.name}
                onChange={(e) => setQuickAddData({...quickAddData, name: e.target.value})}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Supplier"
                value={quickAddData.supplier}
                onChange={(e) => setQuickAddData({...quickAddData, supplier: e.target.value})}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Cost"
                value={quickAddData.cost || ''}
                onChange={(e) => setQuickAddData({...quickAddData, cost: parseFloat(e.target.value) || 0})}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Price"
                value={quickAddData.price || ''}
                onChange={(e) => setQuickAddData({...quickAddData, price: parseFloat(e.target.value) || 0})}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={quickAddData.quantity || ''}
                onChange={(e) => setQuickAddData({...quickAddData, quantity: parseInt(e.target.value) || 0})}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={quickAddData.location}
                onChange={(e) => setQuickAddData({...quickAddData, location: e.target.value})}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => handleQuickAdd(showQuickAdd)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Add {showQuickAdd.charAt(0).toUpperCase() + showQuickAdd.slice(1)}
              </button>
              <button
                onClick={() => setShowQuickAdd('')}
                className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-6 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
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
            </div>
          </Link>

          {/* Urns Management */}
          <Link href="/urns" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Flame className="h-10 w-10 text-purple-600" />
                <TrendingUp className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Urns Management</h3>
              <p className="text-slate-600 text-sm mb-4">Manage urn inventory, pricing, and locations</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-purple-600">{stats.urns.total}</span>
                <span className="text-sm text-slate-500">in stock</span>
              </div>
            </div>
          </Link>

          {/* Suppliers */}
          <Link href="/suppliers" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-10 w-10 text-green-600" />
                <Plus className="h-5 w-5 text-slate-400 group-hover:text-green-600 transition-colors" />
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
    </div>
  )
}