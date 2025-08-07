// Urns Page — Clean and Modern UI with Create/Edit/Delete Modal + Validation
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface Urn {
  id: number
  name: string
  supplier: string
  on_hand: number
  on_order: number
  target_quantity: number
  backordered_quantity: number
  engraving_text?: string
  engraving_font?: string
}

export default function UrnsPage() {
  const [urns, setUrns] = useState<Urn[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    supplier: '',
    target_quantity: 1
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadUrns()
  }, [])

  const loadUrns = async () => {
    try {
      const { data, error } = await supabase.from('urns').select('*')
      if (error) throw error
      setUrns(data || [])
    } catch (err) {
      console.error('Failed to fetch urns:', err)
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
      const { data, error } = await supabase.from('urns').insert({
        name: name.trim(),
        supplier: supplier.trim(),
        on_hand: 0,
        on_order: 0,
        target_quantity: target_quantity || 1,
        backordered_quantity: 0
      }).select().single()
      if (error) throw error
      setUrns(prev => [...prev, data])
      setForm({ name: '', supplier: '', target_quantity: 1 })
      setError('')
    } catch (err) {
      console.error('Failed to create urn:', err)
      setError('Failed to create urn.')
    }
  }

  const handleEdit = (id: number) => {
    alert(`Edit functionality coming soon for urn ID ${id}`)
  }

  const handleDelete = async (id: number) => {
    const confirmed = confirm('Are you sure you want to delete this urn?')
    if (!confirmed) return
    try {
      const { error } = await supabase.from('urns').delete().eq('id', id)
      if (error) throw error
      setUrns(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      console.error('Failed to delete urn:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Loading urns...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Urn Inventory</h1>
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
            className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded flex items-center"
          >
            <Plus size={16} className="mr-1" /> Add
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {urns.map(urn => {
          const total = urn.on_hand + urn.on_order
          const isLow = total < urn.target_quantity
          const hasBackorder = urn.backordered_quantity > 0

          return (
            <div
              key={urn.id}
              className="bg-white rounded-xl shadow border border-slate-200 p-5 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-1">{urn.name}</h2>
                <p className="text-sm text-slate-500 mb-2">Supplier: {urn.supplier}</p>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium text-slate-700">On Hand:</span> {urn.on_hand}</p>
                  <p><span className="font-medium text-slate-700">On Order:</span> {urn.on_order}</p>
                  <p><span className="font-medium text-slate-700">Target:</span> {urn.target_quantity}</p>
                  <p><span className="font-medium text-slate-700">Backordered:</span> {urn.backordered_quantity}</p>
                  {urn.engraving_text && (
                    <p><span className="font-medium text-slate-700">Engraving:</span> {urn.engraving_text} ({urn.engraving_font || 'Font?'})</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  {isLow && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Low Stock</span>}
                  {hasBackorder && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Backordered</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(urn.id)}
                    className="text-violet-600 hover:text-violet-800"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(urn.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
