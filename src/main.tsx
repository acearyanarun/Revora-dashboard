import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { demoApi } from './services/api'

// Swap `demoApi` for an HTTP-backed RevoraApi implementation when a backend exists.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={demoApi} />
  </StrictMode>,
)
