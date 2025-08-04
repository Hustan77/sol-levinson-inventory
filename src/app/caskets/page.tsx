'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, AlertTriangle, Clock, Plus, Search, Edit, Trash2, RotateCcw, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Casket {
  id: number
  name: string
  model: string | null
  supplier: string
  target_quantity: number
  on_hand: number
  on_order: number
  backordered: number
  backordered_quantity: number
  backorder_reason: string | null
  backorder_date: string | null
  location: string
  supplier_instructions: string | null
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
  deceased_name: string
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [filteredCaskets, setFilteredCaskets] = useState<Casket[]>([])
  const [orders, setOrders] = useState<CasketOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showOrderModal, setShowOrderModal] = useState<Casket | null>(null)
  const [showAddCasket, setShowAddCasket] = useState(false)
  const [showEditCasket, setShowEditCasket] = useState<Casket | null>(null)
  const [showReturnModal, setShowReturnModal] = useState<Casket | null>(null)
  const [showAdjustModal, setShowAdjustModal] = useState<Casket | null>(null)
  const [showBackorderModal, setShowBackorderModal] = useState<Casket | null>(null)
  const [backorderData, setBackorderData] = useState({
    quantity: 1,
    reason: '',
    notes: ''
  })

  // Form states
  const [orderData, setOrderData] = useState({
    deceasedName: '',
    expectedDate: ''
  })

  const [returnData, setReturnData] = useState({
    deceasedName: '',
    reason: '',
    notes: ''
  })

  const [adjustData, setAdjustData] = useState({
    type: 'add' as 'add' | 'remove' | 'correction',
    quantity: 1,
    reason: '',
    adjustedBy: '',
    notes: ''
  })

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

  useEffect(() => {
    // Filter caskets based on search term
    const filtered = caskets.filter(casket =>
      casket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (casket.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      casket.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCaskets(filtered)
  }, [caskets, searchTerm])

  const loadData = async () => {
    try {
      const { data: casketsData } = await supabase
        .from('caskets')
        .select('*')
        .order('name')

      const { data: ordersData } = await supabase
        .from('casket_orders')
        .select('*')
        .in('status', ['pending', 'shipped'])
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
    if (casket.backordered_quantity > 0) return 'bg-red-400'
    if (casket.on_hand < casket.target_quantity) return 'bg-amber-400'
    if (casket.on_hand >= casket.target_quantity) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getStatusText = (casket: Casket) => {
    if (casket.on_hand === 0) return 'OUT OF STOCK'
    if (casket.backordered_quantity > 0) return 'BACKORDERED'
    if (casket.on_hand < casket.target_quantity) return 'LOW STOCK'
    if (casket.on_hand >= casket.target_quantity) return 'WELL STOCKED'
    return 'NORMAL'
  }

  // Place order (automatically deducts from on_hand, adds to on_order)
  const handlePlaceOrder = async () => {
    if (!showOrderModal || !orderData.deceasedName) {
      alert('Please enter the deceased name')
      return
    }

    if (showOrderModal.on_hand <= 0) {
      alert('Cannot place order - no inventory on hand to sell!')
      return
    }

    try {
      const expectedDelivery = orderData.expectedDate ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Create order record
      const { error: orderError } = await supabase
        .from('casket_orders')
        .insert([{
          casket_id: showOrderModal.id,
          order_type: 'replacement',
          quantity: 1,
          expected_date: expectedDelivery,
          deceased_name: orderData.deceasedName
        }])

      if (orderError) throw orderError

      // Update casket inventory (sell one, order one)
      const { error: updateError } = await supabase
        .from('caskets')
        .update({
          on_hand: showOrderModal.on_hand - 1,
          on_order: showOrderModal.on_order + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', showOrderModal.id)

      if (updateError) throw updateError

      setShowOrderModal(null)
      setOrderData({ deceasedName: '', expectedDate: '' })
      loadData()
      alert('Order placed successfully! Inventory updated.')
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Error placing order. Please try again.')
    }
  }

  // Record return
  const handleReturn = async () => {
    if (!showReturnModal || !returnData.deceasedName || !returnData.reason) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('casket_returns')
        .insert([{
          casket_id: showReturnModal.id,
          deceased_name: returnData.deceasedName,
          return_reason: returnData.reason,
          notes: returnData.notes
        }])

      if (error) throw error

      setShowReturnModal(null)
      setReturnData({ deceasedName: '', reason: '', notes: '' })
      alert('Return recorded successfully!')
    } catch (error) {
      console.error('Error recording return:', error)
      alert('Error recording return. Please try again.')
    }
  }

  // Inventory adjustment
  const handleAdjustment = async () => {
    if (!showAdjustModal || !adjustData.reason || !adjustData.adjustedBy) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const quantityChange = adjustData.type === 'add' ? adjustData.quantity : -adjustData.quantity
      const newOnHand = Math.max(0, showAdjustModal.on_hand + quantityChange)

      // Record adjustment
      const { error: adjustError } = await supabase
        .from('inventory_adjustments')
        .insert([{
          casket_id: showAdjustModal.id,
          adjustment_type: adjustData.type,
          quantity_change: quantityChange,
          reason: adjustData.reason,
          adjusted_by: adjustData.adjustedBy,
          notes: adjustData.notes
        }])

      if (adjustError) throw adjustError

      // Update casket inventory
      const { error: updateError } = await supabase
        .from('caskets')
        .update({
          on_hand: newOnHand,
          updated_at: new Date().toISOString()
        })
        .eq('id', showAdjustModal.id)

      if (updateError) throw updateError

      setShowAdjustModal(null)
      setAdjustData({ type: 'add' as 'add' | 'remove' | 'correction', quantity: 1, reason: '', adjustedBy: '', notes: '' })
      loadData()
      alert('Inventory adjustment completed!')
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      alert('Error adjusting inventory. Please try again.')
    }
  }

  // Mark arrival
  const handleArrival = async (orderId: number, casketId: number, quantity: number) => {
    try {
      const { error: orderError } = await supabase
        .from('casket_orders')
        .update({
          status: 'arrived',
          actual_arrival_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', orderId)

      if (orderError) throw orderError

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

  // Add new casket
  const addNewCasket = async () => {
    if (!newCasket.name || !newCasket.supplier) {
      alert('Name and supplier are required')
      return
    }

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

  // Update casket
  const updateCasket = async () => {
    if (!showEditCasket) return

    try {
      const { error } = await supabase
        .from('caskets')
        .update({
          name: showEditCasket.name,
          model: showEditCasket.model,
          supplier: showEditCasket.supplier,
          target_quantity: showEditCasket.target_quantity,
          location: showEditCasket.location,
          supplier_instructions: showEditCasket.supplier_instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', showEditCasket.id)

      if (error) throw error

      setShowEditCasket(null)
      loadData()
      alert('Casket updated successfully!')
    } catch (error) {
      console.error('Error updating casket:', error)
      alert('Error updating casket. Please try again.')
    }
  }

  // Delete casket
  const deleteCasket = async (casketId: number, casketName: string) => {
    if (confirm(`Are you sure you want to delete "${casketName}"? This action cannot be undone.`)) {
      try {
        const { error } = await supabase
          .from('caskets')
          .delete()
          .eq('id', casketId)

        if (error) throw error

        loadData()
        alert('Casket deleted successfully!')
      } catch (error) {
        console.error('Error deleting casket:', error)
        alert('Error deleting casket. Please try again.')
      }
    }
  }

  // Handle backorder
  const handleBackorder = async () => {
    if (!showBackorderModal || !backorderData.reason) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('caskets')
        .update({
          backordered_quantity: (showBackorderModal.backordered_quantity || 0) + backorderData.quantity,
          backorder_reason: backorderData.reason,
          backorder_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', showBackorderModal.id)

      if (error) throw error

      setShowBackorderModal(null)
      setBackorderData({ quantity: 1, reason: '', notes: '' })
      loadData()
      alert('Backorder recorded successfully!')
    } catch (error) {
      console.error('Error recording backorder:', error)
      alert('Error recording backorder. Please try again.')
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
            <div className="flex items-center space-x-4">
              <Link
                href="/special-orders"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Special Orders
              </Link>
              <button
                onClick={() => setShowAddCasket(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Casket Type
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search caskets by name, model, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Pending Orders */}
        {orders.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-400 mr-3" />
              <div className="w-full">
                <h3 className="text-lg font-medium text-blue-900">Pending Orders ({orders.length})</h3>
                <div className="mt-2 space-y-2">
                  {orders.map(order => {
                    const casket = caskets.find(c => c.id === order.casket_id)
                    return (
                      <div key={order.id} className="flex justify-between items-center bg-white p-3 rounded">
                        <div>
                          <span className="font-medium">{casket?.name}</span>
                          <span className="text-slate-600 ml-2">- {order.deceased_name}</span>
                          <span className="text-sm text-slate-500 ml-2">Expected: {order.expected_date}</span>
                        </div>
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
          {filteredCaskets.map((casket) => (
            <div key={casket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

              {/* Status Bar */}
              <div className={`h-2 ${getStatusColor(casket)}`}></div>

              {/* Card Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900">{casket.name}</h3>
                    <p className="text-sm text-blue-800">{showOrderModal?.supplier_instructions || 'No instructions available'}</p>
                    <p className="text-sm text-slate-500">{casket.supplier}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setShowEditCasket(casket)}
                      className="p-2 text-slate-400 hover:text-blue-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCasket(casket.id, casket.name)}
                      className="p-2 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-4 ${casket.on_hand === 0 ? 'bg-red-100 text-red-800' :
                  casket.on_hand < casket.target_quantity ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                  {getStatusText(casket)}
                </span>

                {/* Inventory Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900">{casket.on_hand}</div>
                    <div className="text-xs text-slate-500">On Hand</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{casket.on_order}</div>
                    <div className="text-xs text-slate-500">On Order</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{casket.backordered_quantity || 0}</div>
                    <div className="text-xs text-slate-500">Backorder</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-600">{casket.target_quantity}</div>
                    <div className="text-xs text-slate-500">Target</div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center mb-4">
                  <Package className="h-4 w-4 text-slate-400 mr-2" />
                  <span className="text-sm text-slate-600">{casket.location}</span>
                </div>

                {/* Shortage Alert - Updated to exclude backorders from target */}
                {(casket.on_hand + casket.on_order) < casket.target_quantity && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">
                        Short by {casket.target_quantity - (casket.on_hand + casket.on_order)} units
                        {casket.backordered_quantity > 0 && (
                          <span className="block mt-1">({casket.backordered_quantity} backordered - not counted)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Backorder Alert */}
                {casket.backordered_quantity > 0 && (
                  <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                      <div className="text-sm text-red-800">
                        <div className="font-medium">{casket.backordered_quantity} units backordered</div>
                        {casket.backorder_reason && (
                          <div className="mt-1">Reason: {casket.backorder_reason}</div>
                        )}
                        {casket.backorder_date && (
                          <div>Date: {casket.backorder_date}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowOrderModal(casket)}
                    disabled={casket.on_hand <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-2 px-4 rounded-lg"
                  >
                    Sell & Order Replacement
                  </button>

                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => setShowReturnModal(casket)}
                      className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-1 rounded text-xs flex items-center justify-center"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Return
                    </button>
                    <button
                      onClick={() => setShowAdjustModal(casket)}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-1 rounded text-xs flex items-center justify-center"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Adjust
                    </button>
                    <button
                      onClick={() => setShowBackorderModal(casket)}
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-1 rounded text-xs"
                    >
                      Backorder
                    </button>
                    <button
                      onClick={() => {/* We'll add history view later */ }}
                      className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-1 rounded text-xs"
                    >
                      History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCaskets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No caskets found matching your search.</p>
          </div>
        )}
      </main>

      {/* Place Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Sell & Order Replacement: {showOrderModal.name}</h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Supplier Instructions:</h4>
              <p className="text-sm text-blue-800">{showOrderModal?.supplier_instructions || 'No instructions available'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deceased Name *</label>
                <input
                  type="text"
                  value={orderData.deceasedName}
                  onChange={(e) => setOrderData({ ...orderData, deceasedName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Enter name of deceased"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={orderData.expectedDate}
                  onChange={(e) => setOrderData({ ...orderData, expectedDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handlePlaceOrder}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
              >
                Sell & Order Replacement
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

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Record Return: {showReturnModal.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deceased Name *</label>
                <input
                  type="text"
                  value={returnData.deceasedName}
                  onChange={(e) => setReturnData({ ...returnData, deceasedName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Return Reason *</label>
                <select
                  value={returnData.reason}
                  onChange={(e) => setReturnData({ ...returnData, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select reason</option>
                  <option value="Damage during delivery">Damage during delivery</option>
                  <option value="Manufacturing defect">Manufacturing defect</option>
                  <option value="Wrong model/color">Wrong model/color</option>
                  <option value="Family request">Family request</option>
                  <option value="Size issue">Size issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={returnData.notes}
                  onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleReturn}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg"
              >
                Record Return
              </button>
              <button
                onClick={() => setShowReturnModal(null)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Adjust Inventory: {showAdjustModal.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type *</label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as 'add' | 'remove' | 'correction' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="add">Add Inventory</option>
                  <option value="remove">Remove Inventory</option>
                  <option value="correction">Inventory Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <select
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select reason</option>
                  <option value="Physical count correction">Physical count correction</option>
                  <option value="Damage discovered">Damage discovered</option>
                  <option value="Found additional inventory">Found additional inventory</option>
                  <option value="Transfer between locations">Transfer between locations</option>
                  <option value="Display model added/removed">Display model added/removed</option>
                  <option value="System error correction">System error correction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adjusted By *</label>
                <input
                  type="text"
                  value={adjustData.adjustedBy}
                  onChange={(e) => setAdjustData({ ...adjustData, adjustedBy: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Additional details..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAdjustment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
              >
                Apply Adjustment
              </button>
              <button
                onClick={() => setShowAdjustModal(null)}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newCasket.name}
                  onChange={(e) => setNewCasket({ ...newCasket, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={newCasket.model}
                  onChange={(e) => setNewCasket({ ...newCasket, model: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
                <input
                  type="text"
                  value={newCasket.supplier}
                  onChange={(e) => setNewCasket({ ...newCasket, supplier: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Quantity (How many to keep on hand)</label>
                <input
                  type="number"
                  min="0"
                  value={newCasket.target_quantity}
                  onChange={(e) => setNewCasket({ ...newCasket, target_quantity: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current On Hand</label>
                <input
                  type="number"
                  min="0"
                  value={newCasket.on_hand}
                  onChange={(e) => setNewCasket({ ...newCasket, on_hand: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <select
                  value={newCasket.location}
                  onChange={(e) => setNewCasket({ ...newCasket, location: e.target.value })}
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
                  onChange={(e) => setNewCasket({ ...newCasket, supplier_instructions: e.target.value })}
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

      {/* Edit Casket Modal */}
      {showEditCasket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Edit Casket: {showEditCasket.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={showEditCasket.name}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={showEditCasket.model || ''}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, model: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
                <input
                  type="text"
                  value={showEditCasket.supplier}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, supplier: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={showEditCasket.target_quantity}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, target_quantity: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <select
                  value={showEditCasket.location}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, location: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="Warehouse">Warehouse</option>
                  <option value="Selection Room">Selection Room</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Ordering Instructions</label>
                <textarea
                  value={showEditCasket.supplier_instructions || ''}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, supplier_instructions: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateCasket}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
              >
                Update Casket
              </button>
              <button
                onClick={() => setShowEditCasket(null)}
                className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Backorder Modal */}
      {showBackorderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Record Backorder: {showBackorderModal.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Backorder *</label>
                <input
                  type="number"
                  min="1"
                  value={backorderData.quantity}
                  onChange={(e) => setBackorderData({ ...backorderData, quantity: parseInt(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <select
                  value={backorderData.reason}
                  onChange={(e) => setBackorderData({ ...backorderData, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select reason</option>
                  <option value="Supplier out of stock">Supplier out of stock</option>
                  <option value="Manufacturing delay">Manufacturing delay</option>
                  <option value="Shipping issues">Shipping issues</option>
                  <option value="Quality control hold">Quality control hold</option>
                  <option value="Discontinued model">Discontinued model</option>
                  <option value="Seasonal unavailability">Seasonal unavailability</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={backorderData.notes}
                  onChange={(e) => setBackorderData({ ...backorderData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Additional details about the backorder..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleBackorder}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
              >
                Record Backorder
              </button>
              <button
                onClick={() => setShowBackorderModal(null)}
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