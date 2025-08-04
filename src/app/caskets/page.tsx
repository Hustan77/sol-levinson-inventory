'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Casket {
  id: number
  name: string
  model: string
  supplier: string
  cost: number
  price: number
  quantity: number
  location: string
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCasket, setEditingCasket] = useState<Casket | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    model: '',
    supplier: '',
    cost: '',
    price: '',
    quantity: '',
    location: ''
  })

  // Load caskets from database
  useEffect(() => {
    loadCaskets()
  }, [])

  const loadCaskets = async () => {
    try {
      const { data, error } = await supabase
        .from('caskets')
        .select('*')
        .order('name')

      if (error) throw error
      setCaskets(data || [])
    } catch (error) {
      console.error('Error loading caskets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const casketData = {
        name: formData.name,
        model: formData.model,
        supplier: formData.supplier,
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        location: formData.location
      }

      if (editingCasket) {
        // Update existing casket
        const { error } = await supabase
          .from('caskets')
          .update(casketData)
          .eq('id', editingCasket.id)

        if (error) throw error
      } else {
        // Add new casket
        const { error } = await supabase
          .from('caskets')
          .insert([casketData])

        if (error) throw error
      }

      // Reset form and reload data
      setFormData({
        name: '',
        model: '',
        supplier: '',
        cost: '',
        price: '',
        quantity: '',
        location: ''
      })
      setShowAddForm(false)
      setEditingCasket(null)
      loadCaskets()
    } catch (error) {
      console.error('Error saving casket:', error)
      alert('Error saving casket. Please try again.')
    }
  }

  const handleEdit = (casket: Casket) => {
    setEditingCasket(casket)
    setFormData({
      name: casket.name,
      model: casket.model,
      supplier: casket.supplier,
      cost: casket.cost.toString(),
      price: casket.price.toString(),
      quantity: casket.quantity.toString(),
      location: casket.location
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this casket?')) {
      try {
        const { error } = await supabase
          .from('caskets')
          .delete()
          .eq('id', id)

        if (error) throw error
        loadCaskets()
      } catch (error) {
        console.error('Error deleting casket:', error)
        alert('Error deleting casket. Please try again.')
      }
    }
  }

  const cancelEdit = () => {
    setShowAddForm(false)
    setEditingCasket(null)
    setFormData({
      name: '',
      model: '',
      supplier: '',
      cost: '',
      price: '',
      quantity: '',
      location: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading caskets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="mr-4">
                <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Caskets Inventory</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Casket
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {editingCasket ? 'Edit Casket' : 'Add New Casket'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2 flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    {editingCasket ? 'Update Casket' : 'Add Casket'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Caskets Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {caskets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No caskets found. Click &apos;Add Casket&apos; to get started.                  </tr>
                ) : (
                  caskets.map((casket) => (
                    <tr key={casket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{casket.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{casket.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{casket.supplier}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${casket.cost}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${casket.price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{casket.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{casket.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(casket)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(casket.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}