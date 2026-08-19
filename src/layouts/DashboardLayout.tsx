import type { ReactNode } from 'react'
import { Navbar } from '@/components/layout/Navbar'

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
