'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SpecialOrder {
  id: number
  casket_name: string
  model: string | null
  supplier: string | null
  family_name: string
  service_date: string
  order_date: string
  expected_delivery: string | null
  status: string
  notes: string | null
  supplier_order_number: string | null
}

export default function SpecialOrdersPage() {
  const [orders, setOrders] = useState<SpecialOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddOrder, setShowAddOrder] = useState(false)
  
  const [newOrder, setNewOrder] = useState({
    casket_name: '',
    model: '',
    supplier: '',
    family_name: '',
    service_date: '',
    expected_delivery: '',
    notes: '',
    supplier_order_number: ''
  })

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const { data } = await supabase
        .from('special_orders')
        .select('*')
        .order('service_date', { ascending: true })
      
      setOrders(data || [])
    } catch (error) {
      console.error('Error loading special orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const addOrder = async () => {
    if (!newOrder.casket_name || !newOrder.family_name || !newOrder.service_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('special_orders')
        .insert([newOrder])

      if (error) throw error

      setNewOrder({
        casket_name: '',
        model: '',
        supplier: '',
        family_name: '',
        service_date: '',
        expected_delivery: '',
        notes: '',
        supplier_order_number: ''
      })
      setShowAddOrder(false)
      loadOrders()
      alert('Special order created successfully!')
    } catch (error) {
      console.error('Error creating special order:', error)
      alert('Error creating special order. Please try again.')
    }
  }

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('special_orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      loadOrders()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status. Please try again.')
    }
  }

  const getStatusColor = (order: SpecialOrder) => {
    const daysUntilService = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    
    if (order.status === 'arrived') return 'bg-green-500'
    if (order.status === 'delayed') return 'bg-red-500'
    if (daysUntilService <= 3) return 'bg-red-400'
    if (daysUntilService <= 7) return 'bg-amber-400'
    return 'bg-blue-500'
  }

  const getUrgencyLevel = (order: SpecialOrder) => {
    const daysUntilService = Math.ceil((new Date(order.service_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    
    if (order.status === 'arrived') return 'ARRIVED'
    if (order.status === 'delayed') return 'DELAYED'
    if (daysUntilService <= 0) return 'SERVICE TODAY'
    if (daysUntilService <= 3) return 'URGENT'
    if (daysUntilService <= 7) return 'COMING SOON'
    return 'ON SCHEDULE'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl">Loading special orders...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/caskets" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-slate-600 hover:text-slate-900" />
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Special Orders</h1>
            </div>
            <button
              onClick={() => setShowAddOrder(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Special Order
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Status Bar */}
              <div className={`h-2 ${getStatusColor(order)}`}></div>
              
              {/* Card Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{order.casket_name}</h3>
                    <p className="text-slate-600">{order.model || ''}</p>
                    <p className="text-sm text-slate-500">{order.supplier || ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'arrived' ? 'bg-green-100 text-green-800' :
                    order.status === 'delayed' ? 'bg-red-100 text-red-800' :
                    getUrgencyLevel(order) === 'URGENT' ? 'bg-red-100 text-red-800' :
                    getUrgencyLevel(order) === 'COMING SOON' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {getUrgencyLevel(order)}
                  </span>
                </div>

                {/* Family Info */}
                <div className="mb-4">
                  <p className="text-lg font-medium text-slate-900">{order.family_name}</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                    <span className="text-sm text-slate-600">Service: {order.service_date}</span>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ordered:</span>
                      <span className="text-slate-900">{order.order_date}</span>
                    </div>
                    {order.expected_delivery && (
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-600">Expected:</span>
                        <span className="text-slate-900">{order.expected_delivery}</span>
                      </div>
                    )}
                    {order.supplier_order_number && (
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-600">Order #:</span>
                        <span className="text-slate-900">{order.supplier_order_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-600">{order.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {order.status === 'ordered' && (
                    <button
                      onClick={() => updateStatus(order.id, 'shipped')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => updateStatus(order.id, 'arrived')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                    >
                      Mark as Arrived
                    </button>
                  )}
                  
                  {order.status !== 'delayed' && order.status !== 'arrived' && (
                    <button
                      onClick={() => updateStatus(order.id, 'delayed')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                    >
                      Mark as Delayed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No special orders found.</p>
          </div>
        )}
      </main>

      {/* Add Special Order Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create Special Order</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Casket Name *</label>
                <input
                  type="text"
                  value={newOrder.casket_name}
                  onChange={(e) => setNewOrder({...newOrder, casket_name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={newOrder.model}
                  onChange={(e) => setNewOrder({...newOrder, model: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={newOrder.supplier}
                  onChange={(e) => setNewOrder({...newOrder, supplier: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Family Name *</label>
                <input
                  type="text"
                  value={newOrder.family_name}
                  onChange={(e) => setNewOrder({...newOrder, family_name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Date *</label>
                <input
                  type="date"
                  value={newOrder.service_date}
                  onChange={(e) => setNewOrder({...newOrder, service_date: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={newOrder.expected_delivery}
                  onChange={(e) => setNewOrder({...newOrder, expected_delivery: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Order Number</label>
                <input
                  type="text"
                  value={newOrder.supplier_order_number}
                  onChange={(e) => setNewOrder({...newOrder, supplier_order_number: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={addOrder}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
              >
                Create Order
              </button>
              <button
                onClick={() => setShowAddOrder(false)}
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