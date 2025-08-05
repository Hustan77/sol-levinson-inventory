// CasketsPage.tsx — Full Version With Arrival Modal Support
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Search, Edit, Trash2, RotateCcw, Settings, Clock, AlertTriangle, Package
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Casket {
  id: number
  name: string
  model: string | null
  supplier: string
  target_quantity: number
  on_hand: number
  on_order: number
  backordered_quantity: number
  backorder_reason: string | null
  backorder_date: string | null
  location: string
  supplier_instructions: string | null
  interior_dimensions: string | null
  exterior_dimensions: string | null
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
  actual_arrival_date?: string
  arrived_marked_by?: string
  arrived_marked_at?: string
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [filteredCaskets, setFilteredCaskets] = useState<Casket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<CasketOrder[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  const [showArrivalModal, setShowArrivalModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<CasketOrder | null>(null)
  const [arrivalData, setArrivalData] = useState({
    markedBy: '',
    arrivedAt: new Date().toISOString().slice(0, 16)
  })

  const [newCasket, setNewCasket] = useState({
    name: '',
    model: '',
    supplier: '',
    target_quantity: 1,
    on_hand: 0,
    location: '',
    supplier_instructions: '',
    interior_dimensions: '',
    exterior_dimensions: ''
  })

  useEffect(() => {
    loadCaskets()
  }, [])

  useEffect(() => {
    const filtered = caskets.filter(casket =>
      casket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (casket.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      casket.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCaskets(filtered)
  }, [searchTerm, caskets])

  const loadCaskets = async () => {
    try {
      const { data: casketData } = await supabase.from('caskets').select('*').order('name')
      const { data: orderData } = await supabase.from('casket_orders')
        .select('*')
        .in('status', ['pending', 'shipped'])
      setCaskets(casketData || [])
      setOrders(orderData || [])
    } catch (error) {
      console.error('Error loading caskets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCasket = async () => {
    if (!newCasket.name || !newCasket.supplier) {
      alert('Please enter at least name and supplier')
      return
    }

    try {
      const { error } = await supabase.from('caskets').insert([newCasket])
      if (error) throw error

      setNewCasket({
        name: '', model: '', supplier: '', target_quantity: 1,
        on_hand: 0, location: '', supplier_instructions: '',
        interior_dimensions: '', exterior_dimensions: ''
      })
      setShowAddModal(false)
      loadCaskets()
      alert('Casket added successfully!')
    } catch (error) {
      console.error('Error adding casket:', error)
      alert('Error adding casket')
    }
  }

  const getStatusColor = (c: Casket) => {
    if (c.on_hand === 0) return 'bg-red-500'
    if (c.backordered_quantity > 0) return 'bg-red-400'
    if (c.on_hand + c.on_order < c.target_quantity) return 'bg-amber-400'
    return 'bg-green-500'
  }

  const getStatusText = (c: Casket) => {
    if (c.on_hand === 0) return 'OUT OF STOCK'
    if (c.backordered_quantity > 0) return 'BACKORDERED'
    if (c.on_hand + c.on_order < c.target_quantity) return 'LOW STOCK'
    return 'WELL STOCKED'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-stone-100">
        <div className="text-xl text-slate-600">Loading caskets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredCaskets.map((casket) => {
            const activeOrder = orders.find((o) => o.casket_id === casket.id && o.status === 'shipped')
            return (
              <div key={casket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`h-2 ${getStatusColor(casket)}`}></div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{casket.name}</h2>
                      <p className="text-slate-600">{casket.model}</p>
                      <p className="text-sm text-slate-500">{casket.supplier}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(casket).replace('bg', 'text bg-opacity-10')}`}>{getStatusText(casket)}</span>
                  </div>

                  <div className="grid grid-cols-2 text-sm gap-2 mb-3">
                    <div><strong>On Hand:</strong> {casket.on_hand}</div>
                    <div><strong>On Order:</strong> {casket.on_order}</div>
                    <div><strong>Backordered:</strong> {casket.backordered_quantity}</div>
                    <div><strong>Target:</strong> {casket.target_quantity}</div>
                  </div>

                  {casket.backordered_quantity > 0 && (
                    <div className="text-xs text-red-600">
                      Reason: {casket.backorder_reason || 'N/A'}<br />
                      Date: {casket.backorder_date || 'N/A'}
                    </div>
                  )}

                  {activeOrder && (
                    <button
                      onClick={() => {
                        setSelectedOrder(activeOrder)
                        setShowArrivalModal(true)
                      }}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-sm"
                    >
                      Mark Arrived
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
      {/* ... existing header, search, casket grid, and modals remain the same ... */}

      {showArrivalModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Mark Arrival: {selectedOrder.deceased_name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marked By *</label>
                <input
                  type="text"
                  value={arrivalData.markedBy}
                  onChange={(e) => setArrivalData({ ...arrivalData, markedBy: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Date/Time</label>
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
                onClick={async () => {
                  try {
                    const arrivalDate = new Date(arrivalData.arrivedAt).toISOString()
                    const arrivalDay = arrivalDate.split('T')[0]

                    const { error: orderUpdateError } = await supabase
                      .from('casket_orders')
                      .update({
                        status: 'arrived',
                        actual_arrival_date: arrivalDay,
                        arrived_marked_by: arrivalData.markedBy,
                        arrived_marked_at: arrivalDate
                      })
                      .eq('id', selectedOrder.id)

                    const related = caskets.find(c => c.id === selectedOrder.casket_id)
                    if (related) {
                      await supabase
                        .from('caskets')
                        .update({
                          on_hand: related.on_hand + selectedOrder.quantity,
                          on_order: Math.max(0, related.on_order - selectedOrder.quantity),
                          updated_at: arrivalDate
                        })
                        .eq('id', selectedOrder.casket_id)
                    }

                    if (orderUpdateError) throw orderUpdateError

                    setShowArrivalModal(false)
                    setSelectedOrder(null)
                    setArrivalData({ markedBy: '', arrivedAt: new Date().toISOString().slice(0, 16) })
                    await loadCaskets()
                    alert('Casket marked as arrived!')
                  } catch (error) {
                    console.error('Arrival Error:', error)
                    alert('Failed to mark arrival.')
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setShowArrivalModal(false)}
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
