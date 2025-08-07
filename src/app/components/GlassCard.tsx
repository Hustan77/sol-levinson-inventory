// src/app/components/GlassCard.tsx
'use client'

export default function GlassCard({
  title,
  value,
}: { title: string; value: number | string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-xl transition-transform duration-300 hover:scale-[1.03]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 opacity-20 blur-2xl" />
      <div className="relative z-10">
        <p className="text-xs tracking-widest text-white/70">{title.toUpperCase()}</p>
        <p className="mt-1 text-3xl font-extrabold">{value}</p>
      </div>
    </div>
  )
}
