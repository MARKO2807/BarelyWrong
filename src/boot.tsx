import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { recordVisit } from './data/activity'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element in index.html')

recordVisit()

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
