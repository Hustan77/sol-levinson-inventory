// Caskets Page — Clean and Modern UI with Arrival Flow Integration
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Pencil, Trash2, Plus, Truck } from 'lucide-react'
import ArrivalModal from '../components/ArrivalModal'

interface Casket {
  id: number
  name: string
  supplier: string
  on_hand: number
  on_order: number
  target_quantity: number
  backordered_quantity: number
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    supplier: '',
    target_quantity: 1,
    po_number: '',
    backorder: false
  })
  const [error, setError] = useState('')
  const [showArrivalModal, setShowArrivalModal] = useState(false)
  const [selectedCasket, setSelectedCasket] = useState<Casket | null>(null)

  useEffect(() => {
    loadCaskets()
  }, [])

  const loadCaskets = async () => {
    try {
      const { data, error } = await supabase.from('caskets').select('*')
      if (error) throw error
      setCaskets(data || [])
    } catch (err) {
      console.error('Failed to fetch caskets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const { name, supplier, target_quantity } = form
    if (!name.trim() || !supplier.trim()) {
      setError('Name and Supplier are required.')
      return
    }

    try {
      const { data, error } = await supabase.from('caskets').insert({
        name: name.trim(),
        supplier: supplier.trim(),
        on_hand: 0,
        on_order: 0,
        target_quantity: target_quantity || 1,
        backordered_quantity: 0
      }).select().single()
      if (error) throw error
      setCaskets(prev => [...prev, data])
      setForm({ name: '', supplier: '', target_quantity: 1, po_number: '', backorder: false })
      setError('')
    } catch (err) {
      console.error('Failed to create casket:', err)
      setError('Failed to create casket.')
    }
  }

  const handleOrder = async (id: number) => {
    const casket = caskets.find(c => c.id === id)
    if (!casket || !form.po_number.trim()) {
      setError('PO number is required.')
      return
    }

    try {
      const updated = {
        on_hand: Math.max(0, casket.on_hand - 1),
        on_order: form.backorder ? casket.on_order : casket.on_order + 1,
        backordered_quantity: form.backorder ? casket.backordered_quantity + 1 : casket.backordered_quantity
      }
      const { error } = await supabase.from('caskets').update(updated).eq('id', id)
      if (error) throw error
      setForm({ ...form, po_number: '', backorder: false })
      await loadCaskets()
    } catch (err) {
      console.error('Order failed:', err)
      setError('Order failed.')
    }
  }

  const handleMarkArrived = (casket: Casket) => {
    setSelectedCasket(casket)
    setShowArrivalModal(true)
  }

  const handleEdit = (id: number) => {
    alert(`Edit functionality coming soon for casket ID ${id}`)
  }

  const handleDelete = async (id: number) => {
    const confirmed = confirm('Are you sure you want to delete this casket?')
    if (!confirmed) return
    try {
      const { error } = await supabase.from('caskets').delete().eq('id', id)
      if (error) throw error
      setCaskets(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete casket:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Loading caskets...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Casket Inventory</h1>
        <div className="flex gap-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1"
          />
          <input
            placeholder="Supplier"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1"
          />
          <input
            type="number"
            min={1}
            placeholder="Target Qty"
            value={form.target_quantity}
            onChange={(e) => setForm({ ...form, target_quantity: parseInt(e.target.value) })}
            className="w-28 border border-slate-300 rounded px-2 py-1"
          />
          <button
            onClick={handleCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded flex items-center"
          >
            <Plus size={16} className="mr-1" /> Add
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caskets.map(casket => {
          const total = casket.on_hand + casket.on_order
          const isLow = total < casket.target_quantity
          const hasBackorder = casket.backordered_quantity > 0

          return (
            <div
              key={casket.id}
              className="bg-white rounded-xl shadow border border-slate-200 p-5 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-1">{casket.name}</h2>
                <p className="text-sm text-slate-500 mb-2">Supplier: {casket.supplier}</p>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium text-slate-700">On Hand:</span> {casket.on_hand}</p>
                  <p><span className="font-medium text-slate-700">On Order:</span> {casket.on_order}</p>
                  <p><span className="font-medium text-slate-700">Target:</span> {casket.target_quantity}</p>
                  <p><span className="font-medium text-slate-700">Backordered:</span> {casket.backordered_quantity}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    placeholder="PO#"
                    value={form.po_number}
                    onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                    className="flex-1 border border-slate-300 rounded px-2 py-1"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.backorder}
                      onChange={(e) => setForm({ ...form, backorder: e.target.checked })}
                    />
                    Backorder
                  </label>
                </div>
                <button
                  onClick={() => handleOrder(casket.id)}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded"
                >
                  Order Replacement
                </button>
                <button
                  onClick={() => handleMarkArrived(casket)}
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm rounded px-3 py-1 flex items-center justify-center"
                >
                  <Truck size={16} className="mr-1" /> Mark Arrived
                </button>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2">
                    {isLow && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Low Stock</span>}
                    {hasBackorder && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Backordered</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(casket.id)} className="text-sky-600 hover:text-sky-800" title="Edit">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(casket.id)} className="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showArrivalModal && selectedCasket && (
        <ArrivalModal
          isOpen={showArrivalModal}
          onClose={() => setShowArrivalModal(false)}
          order={selectedOrder} // instead of casket={...}
          onSuccess={loadData}
        />

      )}
    </div>
  )
}
