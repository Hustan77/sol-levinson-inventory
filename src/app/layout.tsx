// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inventory',
  description: 'Futuristic inventory dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-[#0b1020] via-[#0d1228] to-[#141a33] text-white">
        {/* soft radial glow */}
        <div className="pointer-events-none fixed inset-0 opacity-40">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="relative">{children}</div>
      </body>
    </html>
  )
}
