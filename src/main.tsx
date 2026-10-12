import '@fontsource-variable/rubik/wght.css'
import '@fontsource/chakra-petch/latin-400.css'
import '@fontsource/chakra-petch/latin-ext-400.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-ext-600.css'
import '@fontsource/vt323/latin-400.css'
import '@fontsource/vt323/latin-ext-400.css'
import './styles/index.css'

import logo from '../assets/logo.png?logo'
import { ROUTES } from './app/routes'
import { LOGO_SIZES } from './ui/logoSizes'

// The big home-page logo is the largest thing on first paint: start downloading it now, while the
// app code is still on its way, instead of after React has rendered the <img>.
if (location.pathname === ROUTES.home && logo.sources.avif) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.type = 'image/avif'
  link.fetchPriority = 'high'
  link.setAttribute('imagesrcset', logo.sources.avif)
  link.setAttribute('imagesizes', LOGO_SIZES.hero)
  document.head.append(link)
}

void import('./boot')
