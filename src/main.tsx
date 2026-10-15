import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadBundledFonts } from './lib/fonts'
import { useProjectStore } from './store/useProjectStore'

// dev only: lets tests and the console reach the project state
if (import.meta.env.DEV) (window as any).__pj = useProjectStore

// declare the bundled fonts; files load only when text uses them
loadBundledFonts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
