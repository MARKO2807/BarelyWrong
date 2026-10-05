import type { ReactNode } from 'react'
import { Header } from './Header'

/** Plain layout for every screen except the home page: header plus centred content. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-safe-x pt-8 pb-safe-y text-center">
        {children}
      </main>
    </div>
  )
}
