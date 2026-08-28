import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/fonts/fonts.css'
import './index.css'
import App from './app/App.jsx'
import { setupGlobalErrorHandlers } from './lib/errorHandler'

setupGlobalErrorHandlers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
