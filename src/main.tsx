import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { demoApi } from './services/api'
import { HttpExecutionEngine } from './services/execution/httpEngine'

const runnerUrl = import.meta.env.VITE_REVORA_RUNNER_URL?.trim()
const api = runnerUrl ? { ...demoApi, isDemo: false, executionEngine: new HttpExecutionEngine(runnerUrl) } : demoApi

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
)
