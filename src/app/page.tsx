import React from "react";
import GlassCard from './components/GlassCard'

type Status = "PENDING" | "ARRIVED" | "BACKORDERED" | "SPECIAL";

export interface OrderCardData {
  id: number;
  productName: string;
  supplierName: string;
  status: Status;
  poNumber: string;
  orderedAt: string;
  expectedAt?: string;
}

export default function OrderCard({ order }: { order: OrderCardData }) {
  const badge =
    order.status === "ARRIVED" ? "bg-green-100 text-green-900"
      : order.status === "BACKORDERED" ? "bg-red-100 text-red-900"
      : order.status === "SPECIAL" ? "bg-purple-100 text-purple-900"
      : "bg-amber-100 text-amber-900";

  const glow =
    order.status === "ARRIVED" ? "shadow-status-arrived"
      : order.status === "BACKORDERED" ? "shadow-status-backordered"
      : order.status === "SPECIAL" ? "shadow-status-special"
      : "shadow-status-pending";

  return (
    <GlassCard className={`p-5 transition-all duration-300 ease-morph hover:scale-[1.02] ${glow}`}>
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">{order.productName}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
          {order.status}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-white/75">
        <p>Supplier: <span className="font-medium text-white">{order.supplierName}</span></p>
        <p>PO#: <span className="font-medium text-white">{order.poNumber}</span></p>
        <p>Ordered: <span className="font-medium text-white">{order.orderedAt}</span></p>
        {order.expectedAt && <p>Expected: <span className="font-medium text-white">{order.expectedAt}</span></p>}
      </div>
    </GlassCard>
  );
}
