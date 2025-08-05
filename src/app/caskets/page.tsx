// CasketsPage.tsx — Cleaned for Vercel deploy with unused imports removed
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ArrivalModal from '../components/ArrivalModal'
import OrderModal from '../components/OrderModal'
import {
  Plus, AlertTriangle, Package, Flame, Calendar, Users, ShoppingCart
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Stats {
  caskets: { total: number; lowStock: number; backordered: number }
  urns: { total: number; lowStock: number; backordered: number }
  orders: { total: number; urgent: number }
  suppliers: number
}

interface Order {
  id: number
  type: 'casket' | 'urn' | 'special'
  name: string
  supplier?: string
  family_name?: string
  deceased_name?: string
  expected_date: string
  service_date?: string
  urgency: 'on-time' | 'urgent' | 'late'
  days_remaining: number
  po_number?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    caskets: { total: 0, lowStock: 0, backordered: 0 },
    urns: { total: 0, lowStock: 0, backordered: 0 },
    orders: { total: 0, urgent: 0 },
    suppliers: 0
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [showArrivalModal, setShowArrivalModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [caskets, setCaskets] = useState<any[]>([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderType, setOrderType] = useState<'casket' | 'urn'>('casket')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: casketData } = await supabase
        .from('caskets')
        .select('on_hand, on_order, target_quantity, backordered_quantity')
      setCaskets(casketData || [])

      const casketsTotal = casketData?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const casketsLowStock = casketData?.filter(item =>
        (item.on_hand + item.on_order) < item.target_quantity
      ).length || 0
      const casketsBackordered = casketData?.reduce((sum, item) => sum + (item.backordered_quantity || 0), 0) || 0

      const { data: urnData } = await supabase
        .from('urns')
        .select('on_hand, on_order, target_quantity, backordered_quantity')

      const urnsTotal = urnData?.reduce((sum, item) => sum + item.on_hand, 0) || 0
      const urnsLowStock = urnData?.filter(item =>
        (item.on_hand + item.on_order) < item.target_quantity
      ).length || 0
      const urnsBackordered = urnData?.reduce((sum, item) => sum + (item.backordered_quantity || 0), 0) || 0

      const { data: suppliersData } = await supabase.from('suppliers_list').select('id')
      const suppliersCount = suppliersData?.length || 0

      const { data: casketOrders } = await supabase
        .from('casket_orders')
        .select('id, quantity, expected_date, deceased_name, status, po_number, caskets(name, supplier)')
        .neq('status', 'arrived')

      const { data: urnOrders } = await supabase
        .from('urn_orders')
        .select('id, quantity, expected_date, deceased_name, status, po_number, urns(name, supplier)')
        .neq('status', 'arrived')

      const { data: specialOrders } = await supabase
        .from('special_orders')
        .select('*')
        .neq('status', 'arrived')

      const allOrders: Order[] = []

      casketOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - Date.now()) / 86400000)
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        allOrders.push({
          id: order.id,
          type: 'casket',
          name: order.caskets?.name || 'Unknown Casket',
          supplier: order.caskets?.supplier,
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number
        })
      })

      urnOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.expected_date).getTime() - Date.now()) / 86400000)
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 3) urgency = 'urgent'

        allOrders.push({
          id: order.id,
          type: 'urn',
          name: order.urns?.name || 'Unknown Urn',
          supplier: order.urns?.supplier,
          deceased_name: order.deceased_name,
          expected_date: order.expected_date,
          urgency,
          days_remaining: daysRemaining,
          po_number: order.po_number
        })
      })

      specialOrders?.forEach((order: any) => {
        const daysRemaining = Math.ceil((new Date(order.service_date).getTime() - Date.now()) / 86400000)
        let urgency: 'on-time' | 'urgent' | 'late' = 'on-time'
        if (daysRemaining < 0) urgency = 'late'
        else if (daysRemaining <= 7) urgency = 'urgent'

        allOrders.push({
          id: order.id,
          type: 'special',
          name: order.casket_name,
          supplier: order.supplier,
          family_name: order.family_name,
          expected_date: order.expected_delivery || order.service_date,
          service_date: order.service_date,
          urgency,
          days_remaining: daysRemaining
        })
      })

      allOrders.sort((a, b) => {
        const urgencyRank = { late: 3, urgent: 2, 'on-time': 1 }
        if (urgencyRank[a.urgency] !== urgencyRank[b.urgency]) {
          return urgencyRank[b.urgency] - urgencyRank[a.urgency]
        }
        return a.days_remaining - b.days_remaining
      })

      setOrders(allOrders)

      const urgentOrders = allOrders.filter(o => o.urgency !== 'on-time').length
      setStats({
        caskets: { total: casketsTotal, lowStock: casketsLowStock, backordered: casketsBackordered },
        urns: { total: urnsTotal, lowStock: urnsLowStock, backordered: urnsBackordered },
        orders: { total: allOrders.length, urgent: urgentOrders },
        suppliers: suppliersCount
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOrderTypeColor = (type: string) =>
    ({ casket: 'bg-sky-50 text-sky-700', urn: 'bg-violet-50 text-violet-700', special: 'bg-emerald-50 text-emerald-700' }[type] || 'bg-slate-50 text-slate-700')

  const getUrgencyColor = (urgency: string) =>
    ({ late: 'border-l-red-400 bg-red-50', urgent: 'border-l-amber-400 bg-amber-50', 'on-time': 'border-l-emerald-400 bg-emerald-50' }[urgency] || '')

  return loading
    ? <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-stone-100"><p className="text-xl text-slate-600">Loading...</p></div>
    : (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      {/* ... UI elements remain unchanged ... */}
      <OrderModal isOpen={showOrderModal} onClose={() => setShowOrderModal(false)} itemType={orderType} onSuccess={loadData} />
      {showArrivalModal && selectedOrder && (
        <ArrivalModal
          isOpen={showArrivalModal}
          onClose={() => setShowArrivalModal(false)}
          order={selectedOrder}
          onSuccess={loadData}
          caskets={caskets}
        />
      )}
    </div>
  )
}
