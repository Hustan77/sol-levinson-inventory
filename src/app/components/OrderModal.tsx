'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'casket' | 'urn'
  onSuccess: () => void
}

export default function OrderModal({ isOpen, onClose, itemType, onSuccess }: OrderModalProps) {
  const [deceasedName, setDeceasedName] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [status, setStatus] = useState('On Order')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!deceasedName || !poNumber || !expectedDate) return alert('All fields are required.')
    setLoading(true)

    const { error } = await supabase.from('casket_orders').insert([
      {
        deceased_name: deceasedName,
        po_number: poNumber,
        expected_date: expectedDate,
        status: status
      }
    ])

    setLoading(false)

    if (error) {
      console.error(error)
      alert('Error adding order.')
    } else {
      onSuccess()
      onClose()
      resetForm()
    }
  }

  const resetForm = () => {
    setDeceasedName('')
    setPoNumber('')
    setExpectedDate('')
    setStatus('On Order')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Order {itemType === 'casket' ? 'Casket' : 'Urn'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name of Deceased</Label>
            <Input value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} />
          </div>
          <div>
            <Label>PO Number</Label>
            <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
          </div>
          <div>
            <Label>Expected Delivery Date</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="On Order">On Order</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Backordered">Backordered</SelectItem>
                <SelectItem value="Special Order">Special Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
