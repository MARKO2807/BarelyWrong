import { createBrowserRouter } from 'react-router'
import { HomeScreen } from '../screens/HomeScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { RouteError } from './RouteError'
import { ROUTES } from './routes'

// The home page loads first and alone; setup, the game and the editor are separate downloads.
// A page that fails (most often a download from an older version after a deploy) shows RouteError.
export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomeScreen />, errorElement: <RouteError /> },
  {
    path: ROUTES.newGame,
    lazy: async () => ({ Component: (await import('../screens/SetupScreen')).SetupScreen }),
    errorElement: <RouteError />,
  },
  {
    path: ROUTES.game,
    lazy: async () => ({ Component: (await import('../screens/GameScreen')).GameScreen }),
    errorElement: <RouteError />,
  },
  {
    path: `${ROUTES.editor}/*`,
    lazy: async () => ({ Component: (await import('../screens/editor/EditorApp')).EditorApp }),
    errorElement: <RouteError />,
  },
  { path: '*', element: <NotFoundScreen /> },
])
