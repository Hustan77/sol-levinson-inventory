import React from "react";

type OrderStatus = "PENDING" | "ARRIVED" | "BACKORDERED";

interface Order {
  id: number;
  productName: string;
  supplierName: string;
  status: OrderStatus;
  poNumber: string;
  orderedAt: string;
  expectedAt?: string;
}

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const glowClass =
    order.status === "PENDING"
      ? "shadow-status-pending"
      : order.status === "ARRIVED"
      ? "shadow-status-arrived"
      : "shadow-status-backordered";

  return (
    <div
      className={`rounded-xl p-5 bg-white dark:bg-neutral-900 transition-all hover:scale-[1.02] ${glowClass}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          {order.productName}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === "PENDING"
              ? "bg-amber-100 text-amber-800"
              : order.status === "ARRIVED"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Supplier */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
        Supplier: <span className="font-medium">{order.supplierName}</span>
      </p>

      {/* PO Number */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
        PO#: <span className="font-medium">{order.poNumber}</span>
      </p>

      {/* Dates */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Ordered: <span className="font-medium">{order.orderedAt}</span>
      </p>
      {order.expectedAt && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Expected: <span className="font-medium">{order.expectedAt}</span>
        </p>
      )}
    </div>
  );
};

export default OrderCard;
