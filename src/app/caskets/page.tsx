'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, AlertTriangle, CheckCircle, Clock, Plus, ExternalLink, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Casket {
  id: number
  name: string
  model: string
  supplier: string
  target_quantity: number
  on_hand: number
  on_order: number
  backordered: number
  location: string
  supplier_instructions: string
  status: 'normal' | 'low_stock' | 'critical' | 'backorder'
}

interface CasketOrder {
  id: number
  casket_id: number
  order_type: string
  quantity: number
  status: string
  order_date: string
  expected_date: string
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [orders, setOrders] = useState<CasketOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showOrderModal, setShowOrderModal] = useState<Casket | null>(null)
  const [showAddCasket, setShowAddCasket] = useState(false)
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [expectedDate, setExpectedDate] = useState('')

  const [newCasket, setNewCasket] = useState({
    name: '',
    model: '',
    supplier: '',
    target_quantity: 1,
    on_hand: 0,
    location: 'Warehouse',
    supplier_instructions: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: casketsData } = await supabase
        .from('caskets')
        .select('*')
        .order('name')
      
      const { data: ordersData } = await supabase
        .from('casket_orders')
        .select('*')
        .eq('status', 'pending')
        .order('order_date', { ascending: false })
      
      setCaskets(casketsData || [])
      setOrders(ordersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (casket: Casket) => {
    if (casket.on_hand === 0) return 'bg-red-500'
    if (casket.status === 'critical') return 'bg-red-400'
    if (casket.status === 'low_stock') return 'bg-amber-400'
    if (casket.on_hand >= casket.target_quantity) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getStatusText = (casket: Casket) => {
    if (casket.on_hand === 0) return 'OUT OF STOCK'
    if (casket.status === 'critical') return 'CRITICAL LOW'
    if (casket.status === 'low_stock') return 'LOW STOCK'
    if (casket.on_hand >= casket.target_quantity) return 'WELL STOCKED'
    return 'NORMAL'
  }

  const handleOrder = async () => {
    if (!showOrderModal) return

    try {
      const expectedDelivery = expectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // Create order record
      const { error: orderError } = await supabase
        .from('casket_orders')
        .insert([{
          casket_id: showOrderModal.id,
          order_type: 'replacement',
          quantity: orderQuantity,
          expected_date: expectedDelivery
        }])

      if (orderError) throw orderError

      // Update casket on_order count
      const { error: updateError } = await supabase
        .from('caskets')
        .update({ 
          on_order: showOrderModal.on_order + orderQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', showOrderModal.id)

      if (updateError) throw updateError

      setShowOrderModal(null)
      setOrderQuantity(1)
      setExpectedDate('')
      loadData()
      alert('Order placed successfully!')
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Error placing order. Please try again.')
    }
  }

  const handleSale = async (casketId: number, currentOnHand: number) => {
    if (currentOnHand <= 0) {
      alert('Cannot sell - no inventory on hand!')
      return
    }

    if (confirm('Record a sale of this casket?')) {
      try {
        const { error } = await supabase
          .from('caskets')
          .update({ 
            on_hand: currentOnHand - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', casketId)

        if (error) throw error
        loadData()
        alert('Sale recorded successfully!')
      } catch (error) {
        console.error('Error recording sale:', error)
        alert('Error recording sale. Please try again.')
      }
    }
  }

  const handleArrival = async (orderId: number, casketId: number, quantity: number) => {
    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('casket_orders')
        .update({ 
          status: 'arrived',
          actual_arrival_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Update casket inventory
      const casket = caskets.find(c => c.id === casketId)
      if (casket) {
        const { error: casketError } = await supabase
          .from('caskets')
          .update({ 
            on_hand: casket.on_hand + quantity,
            on_order: casket.on_order - quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', casketId)

        if (casketError) throw casketError
      }

      loadData()
      alert('Arrival recorded successfully!')
    } catch (error) {
      console.error('Error recording arrival:', error)
      alert('Error recording arrival. Please try again.')
    }
  }

  const addNewCasket = async () => {
    try {
      const { error } = await supabase
        .from('caskets')
        .insert([newCasket])

      if (error) throw error

      setNewCasket({
        name: '',
        model: '',
        supplier: '',
        target_quantity: 1,
        on_hand: 0,
        location: 'Warehouse',
        supplier_instructions: ''
      })
      setShowAddCasket(false)
      loadData()
      alert('Casket added successfully!')
    } catch (error) {
      console.error('Error adding casket:', error)
      alert('Error adding casket. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl">Loading caskets...</div>
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
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-slate-600 hover:text-slate-900" />
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Caskets Inventory</h1>
            </div>
            <button
              onClick={() => setShowAddCasket(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Casket Type
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Pending Orders Section */}
        {orders.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-blue-900">Pending Orders ({orders.length})</h3>
                <div className="mt-2 space-y-1">
                  {orders.map(order => {
                    const casket = caskets.find(c => c.id === order.casket_id)
                    return (
                      <div key={order.id} className="flex justify-between items-center bg-white p-3 rounded">
                        <span className="text-sm">
                          {casket?.name} - Qty: {order.quantity} - Expected: {order.expected_date}
                        </span>
                        <button
                          onClick={() => handleArrival(order.id, order.casket_id, order.quantity)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Mark Arrived
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Caskets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caskets.map((casket) => (
            <div key={casket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Status Bar */}
              <div className={`h-2 ${getStatusColor(casket)}`}></div>
              
              {/* Card Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{casket.name}</h3>
                    <p className="text-slate-600">{casket.model}</p>
                    <p className="text-sm text-slate-500">{casket.supplier}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    casket.on_hand === 0 ? 'bg-red-100 text-red-800' :
                    casket.status === 'low_stock' ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {getStatusText(casket)}
                  </span>
                </div>

                {/* Inventory Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{casket.on_hand}</div>
                    <div className="text-xs text-slate-500">On Hand</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{casket.on_order}</div>
                    <div className="text-xs text-slate-500">On Order</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-600">{casket.target_quantity}</div>
                    <div className="text-xs text-slate-500">Target</div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center mb-4">
                  <Package className="h-4 w-4 text-slate-400 mr-2" />
                  <span className="text-sm text-slate-600">{casket.location}</span>
                </div>

                {/* Shortage Alert */}
                {(casket.on_hand + casket.on_order) < casket.target_quantity && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">
                        Short by {casket.target_quantity - (casket.on_hand + casket.on_order)} units
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowOrderModal(casket)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Place Order
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSale(casket.id, casket.on_hand)}
                      disabled={casket.on_hand <= 0}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white py-2 px-3 rounded text-sm"
                    >
                      Record Sale
                    </button>
                    <Link 
                      href={`/special-orders?casket=${casket.id}`}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm text-center"
                    >
                      Special Order
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Order {showOrderModal.name}</h3>
            
            {/* Supplier Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Supplier Instructions:</h4>
              <p className="text-sm text-blue-800">{showOrderModal.supplier_instructions}</p>
            </div>

            {/* Order Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleOrder}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
              >
                Place Order
              </button>
              <button
                onClick={() => setShowOrderModal(null)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Casket Modal */}
      {showAddCasket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add New Casket Type</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCasket.name}
                  onChange={(e) => setNewCasket({...newCasket, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={newCasket.model}
                  onChange={(e) => setNewCasket({...newCasket, model: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={newCasket.supplier}
                  onChange={(e) => setNewCasket({...newCasket, supplier: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Quantity (How many to keep on hand)</label>
                <input
                  type="number"
                  min="0"
                  value={newCasket.target_quantity}
                  onChange={(e) => setNewCasket({...newCasket, target_quantity: parseInt(e.target.value)})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current On Hand</label>
                <input
                  type="number"
                  min="0"
                  value={newCasket.on_hand}
                  onChange={(e) => setNewCasket({...newCasket, on_hand: parseInt(e.target.value)})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <select
                  value={newCasket.location}
                  onChange={(e) => setNewCasket({...newCasket, location: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="Warehouse">Warehouse</option>
                  <option value="Selection Room">Selection Room</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Ordering Instructions</label>
                <textarea
                  value={newCasket.supplier_instructions}
                  onChange={(e) => setNewCasket({...newCasket, supplier_instructions: e.target.value})}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Include phone numbers, websites, account numbers, lead times, etc."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={addNewCasket}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
              >
                Add Casket
              </button>
              <button
                onClick={() => setShowAddCasket(false)}
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