import { createBrowserRouter } from 'react-router'
import { ComingSoonScreen } from '../screens/ComingSoonScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { ROUTES } from './routes'

export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomeScreen /> },
  // Game setup arrives in phase 3, the editor in phase 5.
  { path: ROUTES.newGame, element: <ComingSoonScreen /> },
  { path: ROUTES.editor, element: <ComingSoonScreen /> },
  { path: '*', element: <NotFoundScreen /> },
])
