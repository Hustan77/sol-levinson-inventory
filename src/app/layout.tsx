import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

/*
  Root layout for the redesigned inventory system.

  The existing application used Next.js and Supabase for a basic dashboard. This
  rewrite embraces a more futuristic aesthetic by leveraging glassmorphism
  techniques. We use a gradient background with blurred, semi‑transparent blobs
  to create depth and motion, while the actual content sits on top of these
  decorative elements. Tailwind’s backdrop‑blur classes are used to achieve
  the frosted glass effect described in the Epic Web article on
  glassmorphism【14648731404760†L20-L67】.

  The HTML structure remains straightforward: we wrap all pages in a top‑level
  `<html>` and `<body>` element, then use absolutely positioned divs to render
  background shapes behind the main content. A `z‑10` on the `<main>` ensures
  that interactive content remains above the decorations. Global fonts are
  loaded through the Inter font, matching the existing project.
*/

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sol Levinson Inventory Management',
  description: 'Inventory management system for Sol Levinson & Bros',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-100 via-white to-sky-50">
        {/* Decorative blurred blobs for a futuristic feel */}
        <div className="pointer-events-none absolute -top-48 -left-32 h-[32rem] w-[32rem] rounded-full bg-sky-400/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-400/30 blur-3xl" />
        {/* Main content container */}
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
}