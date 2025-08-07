// src/app/components/OrderBadge.tsx
'use client'

type Status = 'PENDING' | 'BACKORDERED' | 'ARRIVED' | 'CANCELLED' | string

export default function OrderBadge({
  status,
  onArrive,
}: {
  status: Status
  onArrive?: () => void
}) {
  const isArrived = status === 'ARRIVED'
  const isPending = status === 'PENDING' || status === 'BACKORDERED'

  const style = isArrived
    ? 'bg-emerald-500/20 text-emerald-200'
    : status === 'BACKORDERED'
    ? 'bg-yellow-500/20 text-yellow-200'
    : status === 'CANCELLED'
    ? 'bg-rose-500/20 text-rose-200'
    : 'bg-blue-500/20 text-blue-200'

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
        {status}
      </span>
      {onArrive && isPending && (
        <button
          onClick={onArrive}
          className="text-xs text-indigo-400 hover:underline transition"
        >
          Mark Arrived
        </button>
      )}
    </div>
  )
}
