import type { ReactNode } from 'react'
import { FitToScreen } from './FitToScreen'
import { Header } from './Header'

interface PageShellProps {
  children: ReactNode
  /** On large landscape screens keep the whole page on screen, scaling it down if needed. */
  fit?: boolean
}

/** Plain layout for every screen except the home page: header plus centred content. */
export function PageShell({ children, fit = false }: PageShellProps) {
  if (fit) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg lg:landscape:h-dvh">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col px-safe-x pt-4 pb-safe-y text-center">
          <FitToScreen>{children}</FitToScreen>
        </main>
      </div>
    )
  }
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-safe-x pt-8 pb-safe-y text-center">
        {children}
      </main>
    </div>
  )
}
