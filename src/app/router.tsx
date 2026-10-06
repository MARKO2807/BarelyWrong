import { createBrowserRouter } from 'react-router'
import { GameScreen } from '../screens/GameScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { SetupScreen } from '../screens/SetupScreen'
import { ROUTES } from './routes'

export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomeScreen /> },
  { path: ROUTES.newGame, element: <SetupScreen /> },
  { path: ROUTES.game, element: <GameScreen /> },
  // The editor is a separate download; players never load it.
  {
    path: `${ROUTES.editor}/*`,
    lazy: async () => ({ Component: (await import('../screens/editor/EditorApp')).EditorApp }),
  },
  { path: '*', element: <NotFoundScreen /> },
])
