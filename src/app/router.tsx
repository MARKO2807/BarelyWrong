import { createBrowserRouter } from 'react-router'
import { HomeScreen } from '../screens/HomeScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { ROUTES } from './routes'

// The home page loads first and alone; setup, the game and the editor are separate downloads.
export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomeScreen /> },
  {
    path: ROUTES.newGame,
    lazy: async () => ({ Component: (await import('../screens/SetupScreen')).SetupScreen }),
  },
  {
    path: ROUTES.game,
    lazy: async () => ({ Component: (await import('../screens/GameScreen')).GameScreen }),
  },
  {
    path: `${ROUTES.editor}/*`,
    lazy: async () => ({ Component: (await import('../screens/editor/EditorApp')).EditorApp }),
  },
  { path: '*', element: <NotFoundScreen /> },
])
