import React from "react";

type OrderStatus = "PENDING" | "ARRIVED" | "BACKORDERED" | string;

export interface OrderCardData {
  id: number;
  productName: string;
  supplierName: string;
  status: OrderStatus;
  poNumber: string;
  orderedAt: string;
  expectedAt?: string;
}

interface OrderCardProps {
  order: OrderCardData;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const glowClass =
    order.status === "PENDING"
      ? "status-pending"
      : order.status === "ARRIVED"
      ? "status-arrived"
      : "status-backordered";

  return (
    <div className={`rounded-xl bg-white dark:bg-neutral-900 p-5 shadow ${glowClass}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          {order.productName}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
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
      <p className="mb-1 text-sm text-neutral-500 dark:text-neutral-400">
        Supplier: <span className="font-medium">{order.supplierName}</span>
      </p>

      {/* PO Number */}
      <p className="mb-1 text-sm text-neutral-500 dark:text-neutral-400">
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
