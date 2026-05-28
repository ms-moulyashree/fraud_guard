import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No popup tricks needed — we use loginRedirect which stays in the same tab.
// MSAL handles the #code= hash automatically via handleRedirectPromise()
// in tryAutoLogin() on every page load.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)