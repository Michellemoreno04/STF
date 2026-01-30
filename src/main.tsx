import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/panel/auth/authContext.tsx'
import { AlarmProvider } from './components/panel/alarm/AlarmContext.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AlarmProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AlarmProvider>
    </AuthProvider>
  </StrictMode>,
)
