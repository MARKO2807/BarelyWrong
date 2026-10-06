import { createBrowserRouter } from 'react-router'
import { ComingSoonScreen } from '../screens/ComingSoonScreen'
import { GameScreen } from '../screens/GameScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { SetupScreen } from '../screens/SetupScreen'
import { ROUTES } from './routes'

export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomeScreen /> },
  { path: ROUTES.newGame, element: <SetupScreen /> },
  { path: ROUTES.game, element: <GameScreen /> },
  // The editor arrives in phase 5.
  { path: ROUTES.editor, element: <ComingSoonScreen /> },
  { path: '*', element: <NotFoundScreen /> },
])
