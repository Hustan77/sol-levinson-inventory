// src/app/components/NewOrderModal.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { supabase } from '@/lib/supabaseClient'

type ItemKind = 'CASKET' | 'URN'
type OrderKind = 'STOCK' | 'SPECIAL'
type OrderStatus = 'PENDING' | 'BACKORDERED'

type Supplier = { id: number; name: string; ordering_instructions: string | null }
type CatalogItem = {
  id: number
  name: string
  supplier_id: number | null
  ordering_instructions: string | null
}

export default function NewOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  // form state
  const [itemKind, setItemKind] = useState<ItemKind>('CASKET')
  const [orderKind, setOrderKind] = useState<OrderKind>('STOCK')
  const [status, setStatus] = useState<OrderStatus>('PENDING')
  const [itemId, setItemId] = useState<number | null>(null)
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [deceased, setDeceased] = useState('')
  const [po, setPo] = useState('')
  const [expected, setExpected] = useState<string>('')
  const [specialDesc, setSpecialDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // lookup data
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [caskets, setCaskets] = useState<CatalogItem[]>([])
  const [urns, setUrns] = useState<CatalogItem[]>([])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data: s } = await supabase.from('suppliers').select('id,name,ordering_instructions').order('name')
      const { data: c } = await supabase.from('caskets').select('id,name,supplier_id,ordering_instructions').order('name')
      const { data: u } = await supabase.from('urns').select('id,name,supplier_id,ordering_instructions').order('name')
      setSuppliers(s ?? [])
      setCaskets(c ?? [])
      setUrns(u ?? [])
    })()
  }, [open])

  // derive currently picked catalog item + instructions
  const currentCatalog = itemKind === 'CASKET' ? caskets : urns
  const selectedItem = useMemo(
    () => currentCatalog.find(i => i.id === itemId) ?? null,
    [currentCatalog, itemId]
  )

  const effectiveSupplierId = orderKind === 'SPECIAL'
    ? supplierId
    : (selectedItem?.supplier_id ?? supplierId)

  const effectiveInstructions = useMemo(() => {
    // product override → supplier fallback
    const productInstr = selectedItem?.ordering_instructions
    const supplierInstr = suppliers.find(s => s.id === effectiveSupplierId)?.ordering_instructions
    return productInstr || supplierInstr || 'No instructions saved for this selection.'
  }, [selectedItem, suppliers, effectiveSupplierId])

  const reset = () => {
    setItemKind('CASKET')
    setOrderKind('STOCK')
    setStatus('PENDING')
    setItemId(null)
    setSupplierId(null)
    setDeceased('')
    setPo('')
    setExpected('')
    setSpecialDesc('')
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload = {
        item_kind: itemKind,
        item_id: orderKind === 'SPECIAL' ? null : itemId,
        order_kind: orderKind,
        status,
        deceased_name: deceased,
        po_number: po,
        expected_date: expected || null,
        special_description: orderKind === 'SPECIAL' ? specialDesc : null,
        supplier_id: effectiveSupplierId ?? null,
      }

      const { error } = await supabase.from('orders').insert(payload)
      if (error) throw error
      onCreated()
      reset()
      onClose()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="fixed inset-0 grid place-items-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl border border-white/15 bg-white/10 p-6 text-white backdrop-blur-md shadow-2xl">
          <Dialog.Title className="text-xl font-semibold">New Order</Dialog.Title>

          {/* selectors */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-white/70">Item Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={itemKind}
                onChange={e => { setItemKind(e.target.value as ItemKind); setItemId(null) }}
              >
                <option value="CASKET">Casket</option>
                <option value="URN">Urn</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/70">Order Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={orderKind}
                onChange={e => setOrderKind(e.target.value as OrderKind)}
              >
                <option value="STOCK">Stock (replacement)</option>
                <option value="SPECIAL">Special / Custom</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/70">Status</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={status}
                onChange={e => setStatus(e.target.value as OrderStatus)}
              >
                <option value="PENDING">Pending</option>
                <option value="BACKORDERED">Backordered</option>
              </select>
            </div>
          </div>

          {/* choose product or supplier */}
          {orderKind === 'STOCK' ? (
            <div className="mt-4">
              <label className="text-xs text-white/70">{itemKind === 'CASKET' ? 'Casket' : 'Urn'}</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={itemId ?? ''}
                onChange={e => setItemId(Number(e.target.value))}
              >
                <option value="" disabled>Select…</option>
                {currentCatalog.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-white/70">Supplier</label>
                <select
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                  value={effectiveSupplierId ?? ''}
                  onChange={e => setSupplierId(Number(e.target.value))}
                >
                  <option value="" disabled>Select Supplier…</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/70">Special Description</label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                  value={specialDesc}
                  onChange={e => setSpecialDesc(e.target.value)}
                  placeholder="Color/finish/size/notes"
                />
              </div>
            </div>
          )}

          {/* business fields */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-xs text-white/70">Deceased Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={deceased}
                onChange={e => setDeceased(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-xs text-white/70">PO #</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={po}
                onChange={e => setPo(e.target.value)}
                placeholder="PO-1234"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-white/70">Expected Delivery</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 p-2"
                value={expected}
                onChange={e => setExpected(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-white/70">Ordering Instructions</label>
              <textarea
                className="mt-1 h-24 w-full resize-none rounded-lg border border-white/20 bg-white/10 p-2"
                value={effectiveInstructions}
                readOnly
              />
            </div>
          </div>

          {/* actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 px-4 py-2 ring-1 ring-white/20 hover:bg-white/15"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
              disabled={saving || (orderKind === 'STOCK' && itemId == null)}
            >
              {saving ? 'Saving…' : 'Create Order'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
