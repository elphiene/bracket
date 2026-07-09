import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LiveLanding from './components/LiveLanding.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Root auto-routes to whichever sport is live (else the default). */}
        <Route path="/" element={<LiveLanding />} />
        <Route path="/:sport" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
