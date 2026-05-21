import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './i18n'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          fontSize: '0.85rem',
        },
        success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
        error: { iconTheme: { primary: 'var(--danger)', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
)
