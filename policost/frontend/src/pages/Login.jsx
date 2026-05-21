import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import logo from '../assets/logo.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter email and password')
    
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.data.user, data.data.access_token, data.data.refresh_token)
      toast.success('Login successful')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Top Header */}
      <header className="login-top-header">
        <div className="login-top-brand">
          <img src={logo} alt="PoliTo Logo" style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="login-top-brand-title">PoliSync AI</span>
            <span className="login-top-brand-sub">Politecnico di Torino</span>
          </div>
          <span className="login-top-subtitle">Department Integration & Sync Platform</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="login-top-status-label">System Status:</span>
          <span className="badge badge-success" style={{ background: '#E2FBE8', color: '#1B873F', border: '1px solid #C4F4CE', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>● Online</span>
        </div>
      </header>

      {/* Main Split Area */}
      <main className="login-main">
        {/* Left Column: Sign In Form */}
        <div className="login-col-left">
          <div style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Sign In</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Welcome to the PoliSync enterprise research integration portal.</p>
            </div>
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Email Address <span>*</span></label>
                <input 
                  type="email" 
                  className="form-control" 
                  style={{ height: '48px', fontSize: '0.95rem' }}
                  placeholder="nome.cognome@polito.it"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Password <span>*</span></label>
                <input 
                  type="password" 
                  className="form-control" 
                  style={{ height: '48px', fontSize: '0.95rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg" 
                style={{ 
                  marginTop: '0.5rem', 
                  justifyContent: 'center', 
                  height: '48px', 
                  fontSize: '1rem',
                  backgroundColor: '#003366', 
                  borderColor: '#003366'
                }} 
                disabled={loading}
              >
                {loading ? <Spinner size={20} /> : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#003366', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Demo Test Credentials
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <div><strong>Admin:</strong> admin@polito.it <span style={{ color: 'var(--text-muted)' }}>/</span> Admin123!</div>
                <div><strong>Project Manager:</strong> pm@polito.it <span style={{ color: 'var(--text-muted)' }}>/</span> Pm12345!</div>
                <div><strong>Financial:</strong> giulia.bianchi@polito.it <span style={{ color: 'var(--text-muted)' }}>/</span> Polito2024!</div>
                <div><strong>Staff:</strong> luca.ferrari@polito.it <span style={{ color: 'var(--text-muted)' }}>/</span> Polito2024!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Info & Aesthetics */}
        <div className="login-col-right">
          <div className="login-features-box">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#003366', letterSpacing: '-0.04em', lineHeight: '1.15', marginBottom: '1.5rem' }}>
              Next-Generation Research <br/>Management & Sync
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2.5rem' }}>
              Streamlining administrative compliance and financial transparency for researchers and departments at Politecnico di Torino through automated sync pipelines and AI auditing.
            </p>

            <div className="login-feature-card">
              <span className="login-feature-badge">AI Auditing Engine</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Automatic Double-Invoicing Detection</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Real-time validation against our central repository to prevent duplication and ensure compliance with external audit standards.
              </p>
            </div>

            <div className="login-feature-card">
              <span className="login-feature-badge">ERP Integration</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Medallion Architecture Pipeline</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Seamless synchronization connecting local expenses to institutional budgets, structured in Raw (Bronze), Clean (Silver), and Verified (Gold) layers.
              </p>
            </div>
          </div>

          {/* Decorative background grid element */}
          <div style={{
            position: 'absolute',
            right: '-10%',
            bottom: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(0, 51, 102, 0.05) 0%, rgba(138, 43, 226, 0.05) 70%, transparent 100%)',
            zIndex: 0,
            pointerEvents: 'none'
          }} />
        </div>
      </main>
    </div>
  )
}
