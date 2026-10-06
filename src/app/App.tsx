import { RouterProvider } from 'react-router/dom'
import { GameSessionProvider } from './GameSession'
import { router } from './router'
import { SettingsProvider } from './SettingsProvider'

export function App() {
  return (
    <SettingsProvider>
      <GameSessionProvider>
        <RouterProvider router={router} />
      </GameSessionProvider>
    </SettingsProvider>
  )
}
