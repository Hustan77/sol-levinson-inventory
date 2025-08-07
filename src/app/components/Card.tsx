import React from 'react'

type Props = {
  title: string
  value: string | number
}

export default function Card({ title, value }: Props) {
  return (
    <div className="rounded-xl bg-white/5 p-4 shadow-inner backdrop-blur-md ring-1 ring-white/10 hover:scale-[1.02] transition-transform duration-200">
      <p className="text-sm text-white/70">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
