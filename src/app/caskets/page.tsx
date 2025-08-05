'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, prefer-const */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, AlertTriangle, Clock, Plus, Search, Edit, Trash2, RotateCcw, Settings, History } from 'lucide-react'
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
  interior_dimensions: string | null
  exterior_dimensions: string | null
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
  po_number: string
  is_return_replacement: boolean
}

interface CasketHistory {
  id: number
  action: string
  details: string
  quantity_change: number
  performed_by: string
  performed_at: string
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
  const [showHistoryModal, setShowHistoryModal] = useState<Casket | null>(null)
  const [showArrivalModal, setShowArrivalModal] = useState<CasketOrder | null>(null)
  const [casketHistory, setCasketHistory] = useState<CasketHistory[]>([])

  // Form states
  const [orderData, setOrderData] = useState({
    deceasedName: '',
    expectedDate: '',
    expectedDateTbd: false,
    poNumber: '',
    isBackordered: false,
    backorderNotes: '',
    isReturnReplacement: false,
    returnNotes: ''
  })

  const [returnData, setReturnData] = useState({
    deceasedName: '',
    reason: '',
    notes: '',
    expectsReplacement: false,
    replacementPoNumber: '',
    replacementExpectedDate: '',
    replacementExpectedDateTbd: false
  })

  const [adjustData, setAdjustData] = useState({
    type: 'add' as 'add' | 'remove' | 'correction',
    quantity: 1,
    reason: '',
    adjustedBy: '',
    notes: ''
  })

  const [arrivalData, setArrivalData] = useState({
    markedBy: '',
    arrivedAt: new Date().toISOString().slice(0, 16) // Format for datetime-local input
  })

  const [newCasket, setNewCasket] = useState({
    name: '',
    model: '',
    supplier: '',
    target_quantity: 1,
    on_hand: 0,
    location: 'Warehouse',
    supplier_instructions: '',
    interior_dimensions: '',
    exterior_dimensions: ''
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

  const loadCasketHistory = async (casketId: number) => {
    try {
      const { data } = await supabase
        .from('casket_history')
        .select('*')
        .eq('casket_id', casketId)
        .order('performed_at', { ascending: false })

      setCasketHistory(data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const recordHistory = async (casketId: number, action: string, details: string, quantityChange: number = 0, performedBy: string = 'System') => {
    try {
      await supabase
        .from('casket_history')
        .insert([{
          casket_id: casketId,
          action,
          details,
          quantity_change: quantityChange,
          performed_by: performedBy
        }])
    } catch (error) {
      console.error('Error recording history:', error)
    }
  }

  const getStatusColor = (casket: Casket) => {
    if (casket.on_hand === 0) return 'bg-red-500'
    if (casket.backordered_quantity > 0) return 'bg-red-400'
    if ((casket.on_hand + casket.on_order) < casket.target_quantity) return 'bg-amber-400'
    if ((casket.on_hand + casket.on_order) >= casket.target_quantity) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getStatusText = (casket: Casket) => {
    if (casket.on_hand === 0) return 'OUT OF STOCK'
    if (casket.backordered_quantity > 0) return 'BACKORDERED'
    if ((casket.on_hand + casket.on_order) < casket.target_quantity) return 'LOW STOCK'
    if ((casket.on_hand + casket.on_order) >= casket.target_quantity) return 'WELL STOCKED'
    return 'NORMAL'
  }

  // Place order with full functionality
  const handlePlaceOrder = async () => {
    if (!showOrderModal || !orderData.deceasedName || !orderData.poNumber) {
      alert('Please enter the deceased name and PO number')
      return
    }

    if (!orderData.isReturnReplacement && showOrderModal.on_hand <= 0) {
      alert('Cannot place order - no inventory on hand to sell!')
      return
    }

    try {
      const expectedDelivery = orderData.expectedDateTbd ? null :
        (orderData.expectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      // Create order record
      const { error: orderError } = await supabase
        .from('casket_orders')
        .insert([{
          casket_id: showOrderModal.id,
          order_type: orderData.isReturnReplacement ? 'return_replacement' : 'replacement',
          quantity: 1,
          expected_date: expectedDelivery,
          expected_date_tbd: orderData.expectedDateTbd,
          deceased_name: orderData.deceasedName,
          po_number: orderData.poNumber,
          is_return_replacement: orderData.isReturnReplacement,
          return_notes: orderData.returnNotes,
          backorder_notes: orderData.backorderNotes
        }])

      if (orderError) throw orderError

      // Update casket inventory
      let updateData: any = { updated_at: new Date().toISOString() }

      if (!orderData.isReturnReplacement) {
        // Regular sale - deduct from on_hand
        updateData.on_hand = showOrderModal.on_hand - 1
      }

      if (orderData.isBackordered) {
        updateData.backordered_quantity = (showOrderModal.backordered_quantity || 0) + 1
        updateData.backorder_reason = orderData.backorderNotes || 'Backordered during ordering'
        updateData.backorder_date = new Date().toISOString().split('T')[0]
      } else {
        updateData.on_order = showOrderModal.on_order + 1
      }

      const { error: updateError } = await supabase
        .from('caskets')
        .update(updateData)
        .eq('id', showOrderModal.id)

      if (updateError) throw updateError

      // Record history
      const historyAction = orderData.isReturnReplacement ? 'Return Replacement Order' : 'Sale & Order'
      const historyDetails = `${orderData.deceasedName} - PO: ${orderData.poNumber}${orderData.isBackordered ? ' (Backordered)' : ''}`
      await recordHistory(showOrderModal.id, historyAction, historyDetails, orderData.isReturnReplacement ? 0 : -1)

      setShowOrderModal(null)
      setOrderData({
        deceasedName: '',
        expectedDate: '',
        expectedDateTbd: false,
        poNumber: '',
        isBackordered: false,
        backorderNotes: '',
        isReturnReplacement: false,
        returnNotes: ''
      })
      loadData()
      alert('Order placed successfully!')
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Error placing order. Please try again.')
    }
  }

  // Enhanced return handling
  const handleReturn = async () => {
    if (!showReturnModal || !returnData.deceasedName || !returnData.reason) {
      alert('Please fill in all required fields')
      return
    }

    try {
      let replacementOrderId = null

      // If expecting replacement, create the replacement order
      if (returnData.expectsReplacement && returnData.replacementPoNumber) {
        const expectedDelivery = returnData.replacementExpectedDateTbd ? null :
          (returnData.replacementExpectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

        const { data: orderData, error: orderError } = await supabase
          .from('casket_orders')
          .insert([{
            casket_id: showReturnModal.id,
            order_type: 'return_replacement',
            quantity: 1,
            expected_date: expectedDelivery,
            expected_date_tbd: returnData.replacementExpectedDateTbd,
            deceased_name: returnData.deceasedName,
            po_number: returnData.replacementPoNumber,
            is_return_replacement: true,
            return_notes: `Replacement for return: ${returnData.reason}`
          }])
          .select()

        if (orderError) throw orderError
        replacementOrderId = orderData[0].id

        // Update inventory for replacement order
        const { error: updateError } = await supabase
          .from('caskets')
          .update({
            on_order: showReturnModal.on_order + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', showReturnModal.id)

        if (updateError) throw updateError
      }

      // Record the return
      const { error } = await supabase
        .from('casket_returns')
        .insert([{
          casket_id: showReturnModal.id,
          deceased_name: returnData.deceasedName,
          return_reason: returnData.reason,
          notes: returnData.notes,
          expects_replacement: returnData.expectsReplacement,
          replacement_order_id: replacementOrderId
        }])

      if (error) throw error

      // Record history
      const historyDetails = `${returnData.deceasedName} - ${returnData.reason}${returnData.expectsReplacement ? ' (Replacement ordered)' : ''}`
      await recordHistory(showReturnModal.id, 'Return', historyDetails)

      setShowReturnModal(null)
      setReturnData({
        deceasedName: '',
        reason: '',
        notes: '',
        expectsReplacement: false,
        replacementPoNumber: '',
        replacementExpectedDate: '',
        replacementExpectedDateTbd: false
      })
      loadData()
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

      // Record history
      await recordHistory(showAdjustModal.id, `Inventory ${adjustData.type}`, adjustData.reason, quantityChange, adjustData.adjustedBy)

      setShowAdjustModal(null)
      setAdjustData({ type: 'add' as 'add' | 'remove' | 'correction', quantity: 1, reason: '', adjustedBy: '', notes: '' })
      loadData()
      alert('Inventory adjustment completed!')
    } catch (error) {
      console.error('Error adjusting inventory:', error)
      alert('Error adjusting inventory. Please try again.')
    }
  }

  // Enhanced arrival marking
  const handleArrival = async () => {
    if (!showArrivalModal || !arrivalData.markedBy) {
      alert('Please enter who is marking this arrival')
      return
    }

    try {
      const { error: orderError } = await supabase
        .from('casket_orders')
        .update({
          status: 'arrived',
          actual_arrival_date: new Date(arrivalData.arrivedAt).toISOString().split('T')[0],
          arrived_marked_by: arrivalData.markedBy,
          arrived_marked_at: new Date(arrivalData.arrivedAt).toISOString()
        })
        .eq('id', showArrivalModal.id)

      if (orderError) throw orderError

      const casket = caskets.find(c => c.id === showArrivalModal.casket_id)
      if (casket) {
        const { error: casketError } = await supabase
          .from('caskets')
          .update({
            on_hand: casket.on_hand + showArrivalModal.quantity,
            on_order: Math.max(0, casket.on_order - showArrivalModal.quantity),
            updated_at: new Date().toISOString()
          })
          .eq('id', showArrivalModal.casket_id)

        if (casketError) throw casketError

        // Record history
        await recordHistory(casket.id, 'Arrival', `PO: ${showArrivalModal.po_number} - Marked by ${arrivalData.markedBy}`, showArrivalModal.quantity, arrivalData.markedBy)
      }

      setShowArrivalModal(null)
      setArrivalData({
        markedBy: '',
        arrivedAt: new Date().toISOString().slice(0, 16)
      })
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
        supplier_instructions: '',
        interior_dimensions: '',
        exterior_dimensions: ''
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
          interior_dimensions: showEditCasket.interior_dimensions,
          exterior_dimensions: showEditCasket.exterior_dimensions,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center">
        <div className="text-xl">Loading caskets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
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
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg"
              >
                Special Orders
              </Link>
              <button
                onClick={() => setShowAddCasket(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg flex items-center"
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
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Pending Orders */}
        {orders.length > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-sky-500 mr-3" />
              <div className="w-full">
                <h3 className="text-lg font-medium text-sky-900">Pending Orders ({orders.length})</h3>
                <div className="mt-2 space-y-2">
                  {orders.map(order => {
                    const casket = caskets.find(c => c.id === order.casket_id)
                    return (
                      <div key={order.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                        <div>
                          <span className="font-medium">{casket?.name}</span>
                          <span className="text-slate-600 ml-2">- {order.deceased_name}</span>
                          <span className="text-sm text-slate-500 ml-2">PO: {order.po_number}</span>
                          <span className="text-sm text-slate-500 ml-2">Expected: {order.expected_date || 'TBD'}</span>
                          {order.is_return_replacement && (
                            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">RETURN/EXCHANGE</span>
                          )}
                        </div>
                        <button
                          onClick={() => setShowArrivalModal(order)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm"
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
            <div key={casket.id} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/50 overflow-hidden">

              {/* Status Bar */}
              <div className={`h-2 ${getStatusColor(casket)}`}></div>

              {/* Card Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900">{casket.name}</h3>
                    <p className="text-slate-600">{casket.model || ''}</p>
                    <p className="text-sm text-slate-500">{casket.supplier}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setShowEditCasket(casket)}
                      className="p-2 text-slate-400 hover:text-sky-600"
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
                  (casket.on_hand + casket.on_order) < casket.target_quantity ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
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
                    <div className="text-xl font-bold text-sky-600">{casket.on_order}</div>
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

                {/* Dimensions */}
                {(casket.interior_dimensions || casket.exterior_dimensions) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                    <h4 className="font-medium text-slate-900 text-sm mb-1">Dimensions:</h4>
                    {casket.interior_dimensions && (
                      <p className="text-sm text-slate-700">Interior: {casket.interior_dimensions}</p>
                    )}
                    {casket.exterior_dimensions && (
                      <p className="text-sm text-slate-700">Exterior: {casket.exterior_dimensions}</p>
                    )}
                  </div>
                )}

                {/* Shortage Alert */}
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
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg"
                  >
                    Order Casket
                  </button>

                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setShowReturnModal(casket)}
                      className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-1 rounded text-xs flex items-center justify-center"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Return
                    </button>
                    <button
                      onClick={() => setShowAdjustModal(casket)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-1 rounded text-xs flex items-center justify-center"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Adjust
                    </button>
                    <button
                      onClick={() => {
                        setShowHistoryModal(casket)
                        loadCasketHistory(casket.id)
                      }}
                      className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-1 rounded text-xs flex items-center justify-center"
                    >
                      <History className="h-3 w-3 mr-1" />
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

      {/* Enhanced Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Order Casket: {showOrderModal.name}</h3>

            <div className="space-y-4">
              {/* Order Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order Type</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setOrderData({ ...orderData, isReturnReplacement: false })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${!orderData.isReturnReplacement
                      ? 'bg-sky-100 text-sky-700 border border-sky-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                  >
                    Regular Sale & Order
                  </button>
                  <button
                    onClick={() => setOrderData({ ...orderData, isReturnReplacement: true })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${orderData.isReturnReplacement
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                  >
                    Return/Exchange
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {orderData.isReturnReplacement ? 'Family Name' : 'Deceased Name'} *
                </label>
                <input
                  type="text"
                  value={orderData.deceasedName}
                  onChange={(e) => setOrderData({ ...orderData, deceasedName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder={orderData.isReturnReplacement ? "Enter family name" : "Enter name of deceased"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  value={orderData.poNumber}
                  onChange={(e) => setOrderData({ ...orderData, poNumber: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Enter purchase order number"
                />
              </div>

              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="expectedDateTbd"
                    checked={orderData.expectedDateTbd}
                    onChange={(e) => setOrderData({ ...orderData, expectedDateTbd: e.target.checked })}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="expectedDateTbd" className="ml-2 text-sm text-slate-700">
                    Expected delivery date is TBD
                  </label>
                </div>

                {!orderData.expectedDateTbd && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={orderData.expectedDate}
                      onChange={(e) => setOrderData({ ...orderData, expectedDate: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isBackordered"
                  checked={orderData.isBackordered}
                  onChange={(e) => setOrderData({ ...orderData, isBackordered: e.target.checked })}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="isBackordered" className="ml-2 text-sm text-slate-700">
                  Mark as backordered (supplier cannot fulfill immediately)
                </label>
              </div>

              {orderData.isBackordered && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Backorder Notes</label>
                  <textarea
                    value={orderData.backorderNotes}
                    onChange={(e) => setOrderData({ ...orderData, backorderNotes: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="Explain why this is backordered, expected timeline, etc."
                  />
                </div>
              )}

              {orderData.isReturnReplacement && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Return/Exchange Notes</label>
                  <textarea
                    value={orderData.returnNotes}
                    onChange={(e) => setOrderData({ ...orderData, returnNotes: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="Reason for return/exchange, damage details, etc."
                  />
                </div>
              )}

              {/* Supplier Instructions */}
              {showOrderModal.supplier_instructions && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <h4 className="font-medium text-sky-900 mb-2">Supplier Instructions:</h4>
                  <p className="text-sm text-sky-800">{showOrderModal.supplier_instructions}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handlePlaceOrder}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg"
              >
                {orderData.isReturnReplacement ? 'Order Replacement' : 'Sell & Order Replacement'}
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

      {/* Enhanced Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
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

              <div className="border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="expectsReplacement"
                    checked={returnData.expectsReplacement}
                    onChange={(e) => setReturnData({ ...returnData, expectsReplacement: e.target.checked })}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="expectsReplacement" className="ml-2 text-sm font-medium text-slate-700">
                    Expecting a replacement casket
                  </label>
                </div>

                {returnData.expectsReplacement && (
                  <div className="space-y-3 bg-sky-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sky-900">Replacement Order Details</h4>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Replacement PO Number *</label>
                      <input
                        type="text"
                        value={returnData.replacementPoNumber}
                        onChange={(e) => setReturnData({ ...returnData, replacementPoNumber: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        placeholder="Enter PO number for replacement"
                      />
                    </div>

                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="replacementExpectedDateTbd"
                        checked={returnData.replacementExpectedDateTbd}
                        onChange={(e) => setReturnData({ ...returnData, replacementExpectedDateTbd: e.target.checked })}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <label htmlFor="replacementExpectedDateTbd" className="ml-2 text-sm text-slate-700">
                        Expected delivery date is TBD
                      </label>
                    </div>

                    {!returnData.replacementExpectedDateTbd && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery Date</label>
                        <input
                          type="date"
                          value={returnData.replacementExpectedDate}
                          onChange={(e) => setReturnData({ ...returnData, replacementExpectedDate: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    )}
                  </div>
                )}
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg"
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

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">History: {showHistoryModal.name}</h3>

            <div className="space-y-3">
              {casketHistory.length > 0 ? (
                casketHistory.map((entry) => (
                  <div key={entry.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-slate-900">{entry.action}</h4>
                      <span className="text-sm text-slate-500">
                        {new Date(entry.performed_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{entry.details}</p>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>By: {entry.performed_by}</span>
                      {entry.quantity_change !== 0 && (
                        <span className={`font-medium ${entry.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No history records found
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHistoryModal(null)}
                className="bg-slate-300 hover:bg-slate-400 text-slate-700 py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Arrival Modal */}
      {showArrivalModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Mark Arrival</h3>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Order Details:</h4>
                <p className="text-sm text-slate-700">PO: {showArrivalModal.po_number}</p>
                <p className="text-sm text-slate-700">Deceased: {showArrivalModal.deceased_name}</p>
                <p className="text-sm text-slate-700">Expected: {showArrivalModal.expected_date || 'TBD'}</p>
                {showArrivalModal.is_return_replacement && (
                  <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    RETURN/EXCHANGE
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marked By *</label>
                <input
                  type="text"
                  value={arrivalData.markedBy}
                  onChange={(e) => setArrivalData({ ...arrivalData, markedBy: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Date & Time *</label>
                <input
                  type="datetime-local"
                  value={arrivalData.arrivedAt}
                  onChange={(e) => setArrivalData({ ...arrivalData, arrivedAt: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleArrival}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg"
              >
                Mark as Arrived
              </button>
              <button
                onClick={() => setShowArrivalModal(null)}
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Quantity</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Interior Dimensions</label>
                <input
                  type="text"
                  value={newCasket.interior_dimensions}
                  onChange={(e) => setNewCasket({ ...newCasket, interior_dimensions: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., 78&quot; L x 24&quot; W x 16&quot; H"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exterior Dimensions</label>
                <input
                  type="text"
                  value={newCasket.exterior_dimensions}
                  onChange={(e) => setNewCasket({ ...newCasket, exterior_dimensions: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., 84&quot; L x 28&quot; W x 18&quot; H"
                />
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
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg"
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Interior Dimensions</label>
                <input
                  type="text"
                  value={showEditCasket.interior_dimensions || ''}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, interior_dimensions: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., 78&quot; L x 24&quot; W x 16&quot; H"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exterior Dimensions</label>
                <input
                  type="text"
                  value={showEditCasket.exterior_dimensions || ''}
                  onChange={(e) => setShowEditCasket({ ...showEditCasket, exterior_dimensions: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., 84&quot; L x 28&quot; W x 18&quot; H"
                />
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
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg"
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
    </div>
  )
}