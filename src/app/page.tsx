'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Card from './components/Card';
import OrderCard from './components/OrderCard';
import OrderCasketButton from './components/OrderCasketButton';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [casketCount, setCasketCount] = useState(0);
  const [urnCount, setUrnCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      const { count: caskets } = await supabase.from('caskets').select('*', { count: 'exact', head: true });
      const { count: urns } = await supabase.from('urns').select('*', { count: 'exact', head: true });
      const { count: suppliers } = await supabase.from('suppliers').select('*', { count: 'exact', head: true });
      const { data: orders } = await supabase.from('orders').select('*').neq('status', 'archived');

      setCasketCount(caskets || 0);
      setUrnCount(urns || 0);
      setSupplierCount(suppliers || 0);
      setActiveOrders(orders || []);
    };

    fetchCounts();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f0f1b] via-[#111827] to-[#1f2937] p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Inventory Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card title="Caskets" value={casketCount} />
          <Card title="Urns" value={urnCount} />
          <Card title="Suppliers" value={supplierCount} />
          <Card title="Active Orders" value={activeOrders.length} />
        </div>

        <div className="flex items-center justify-between mt-8">
          <h2 className="text-2xl font-semibold">Active Orders</h2>
          <OrderCasketButton />
        </div>

        <div className="space-y-4">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </main>
  );
}
