import { useTranslation } from 'react-i18next'

// StatusBadge — maps expense/project status to styled badge
export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const label = t(`status_${status}`) !== `status_${status}` ? t(`status_${status}`) : status
  return <span className={`badge badge-${status}`}>{label}</span>
}

// Modal
export function Modal({ title, onClose, children, footer, size = '' }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// Empty state
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: '3rem', opacity: 0.4 }}>{icon || '📭'}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

// Spinner
export function Spinner({ size = 24 }) {
  return <span className="spinner" style={{ width: size, height: size }} />
}

export function PageLoader() {
  return <div className="page-loader"><Spinner size={36} /></div>
}

// Progress bar
export function ProgressBar({ value, max, variant = 'primary' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = pct > 90 ? 'danger' : pct > 70 ? 'warning' : variant
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Stat card
export function StatCard({ icon, label, value, variant = 'primary', subtitle }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className={`stat-icon ${variant}`}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

// File upload dropzone
export function FileDropzone({ onFile, accept = '.pdf,.jpg,.jpeg,.png,.xlsx,.csv,.docx' }) {
  const handleDrop = e => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }
  const handleChange = e => { if (e.target.files[0]) onFile(e.target.files[0]) }
  return (
    <label
      className="file-drop"
      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
      onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
      onDrop={handleDrop}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📎</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Drag & drop a file or <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>click to browse</span>
      </p>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        PDF, JPG, PNG, XLSX, CSV, DOCX — max 10 MB
      </p>
      <input type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
    </label>
  )
}

// Currency formatter
export function formatCurrency(amount, currency = 'EUR') {
  const parsed = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(parsed)) return '—';
  return new Intl.NumberFormat('it-IT', { 
    style: 'currency', 
    currency, 
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsed);
}

// Date formatter
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr))
}
