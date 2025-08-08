// Supplier Management Page
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Plus } from 'lucide-react'

interface Supplier {
  id: number
  name: string
  contact: string
  phone?: string
  instructions?: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', contact: '', phone: '', instructions: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase.from('suppliers_list').select('*')
      if (error) throw error
      setSuppliers(data || [])
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const { name, contact, phone, instructions } = form
    if (!name.trim() || !contact.trim()) {
      setError('Name and contact are required.')
      return
    }

    try {
      const { data, error } = await supabase.from('suppliers_list').insert({
        name: name.trim(),
        contact: contact.trim(),
        phone: phone.trim(),
        instructions: instructions.trim()
      }).select().single()
      if (error) throw error
      setSuppliers(prev => [...prev, data])
      setForm({ name: '', contact: '', phone: '', instructions: '' })
      setError('')
    } catch (err) {
      console.error('Failed to add supplier:', err)
      setError('Failed to add supplier.')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = confirm('Are you sure you want to delete this supplier?')
    if (!confirmed) return
    try {
      const { error } = await supabase.from('suppliers_list').delete().eq('id', id)
      if (error) throw error
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Failed to delete supplier:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Loading suppliers...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Suppliers</h1>
        <div className="flex gap-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1"
          />
          <input
            placeholder="Contact"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1"
          />
          <input
            placeholder="Instructions"
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(supplier => (
          <div
            key={supplier.id}
            className="bg-white rounded-xl shadow border border-slate-200 p-5 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-1">{supplier.name}</h2>
              <p className="text-sm text-slate-500 mb-1">Contact: {supplier.contact}</p>
              {supplier.phone && <p className="text-sm text-slate-500 mb-1">Phone: {supplier.phone}</p>}
              {supplier.instructions && <p className="text-sm text-slate-500">Instructions: {supplier.instructions}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                className="text-red-600 hover:text-red-800"
                onClick={() => handleDelete(supplier.id)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
