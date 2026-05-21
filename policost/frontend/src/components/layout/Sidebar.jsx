import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Receipt, FolderKanban, CheckSquare, Users, BarChart3, LogOut, ChevronUp, RefreshCw, Database, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'
import { usersApi, authApi } from '../../api'
import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'

const NavItem = ({ to, icon: Icon, label, badge, sidebarOpen = true }) => (
  <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} title={!sidebarOpen ? label : undefined}>
    <Icon size={17} />
    {sidebarOpen && <span>{label}</span>}
    {badge > 0 && sidebarOpen && <span className="badge-count">{badge}</span>}
  </NavLink>
)

export default function Sidebar() {
  const { user, hasAnyRole, logout, originalAdmin, setImpersonation, clearImpersonation, accessToken, refreshToken, sidebarOpen } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isAdmin = hasAnyRole('ADMIN_DEPARTMENT') || originalAdmin
  const isApprover = hasAnyRole('ADMIN_DEPARTMENT', 'PROJECT_MANAGER', 'FINANCIAL_APPROVER')

  const [showImpersonate, setShowImpersonate] = useState(false)
  const [users, setUsers] = useState([])
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (isAdmin && showImpersonate && users.length === 0) {
      usersApi.list().then(res => setUsers(res.data.data)).catch(console.error)
    }
  }, [isAdmin, showImpersonate])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowImpersonate(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownRef])

  const initials = (user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '') || '??'
  const primaryRole = user?.roles?.[0]?.name?.replace(/_/g, ' ') ?? 'User'

  const handleLogout = () => { logout(); navigate('/login') }

  const handleImpersonate = async (targetUser) => {
    try {
      const { data } = await authApi.impersonate(targetUser.id)
      setImpersonation(data.data.user, data.data.access_token, data.data.refresh_token, user, accessToken, refreshToken)
      setShowImpersonate(false)
      toast.success(`Impersonating ${targetUser.full_name}`)
      navigate('/')
    } catch (err) {
      toast.error('Failed to impersonate')
    }
  }

  const handleReturnToAdmin = () => {
    clearImpersonation()
    toast.success('Returned to Admin session')
    navigate('/')
  }

  return (
    <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-logo" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: sidebarOpen ? '12px' : '0' }}>
        <img 
          src={logo} 
          alt="PoliSync Logo" 
          style={sidebarOpen ? { 
            height: '36px', 
            objectFit: 'contain' 
          } : { 
            height: '36px', 
            width: '36px', 
            objectFit: 'cover', 
            objectPosition: 'left' 
          }} 
        />
        {sidebarOpen && (
          <div className="sidebar-logo-text" style={{ marginLeft: '2px' }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>PoliSync AI</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>Research Sync</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {sidebarOpen && <div className="sidebar-section-label">{t('sidebar_main')}</div>}
        <NavItem to="/" icon={LayoutDashboard} label={t('dashboard')} sidebarOpen={sidebarOpen} />
        <NavItem to="/expenses" icon={Receipt} label={t('expenses')} sidebarOpen={sidebarOpen} />
        <NavItem to="/projects" icon={FolderKanban} label={t('projects')} sidebarOpen={sidebarOpen} />
        <NavItem to="/personnel" icon={Users} label={t('sidebar_personnel')} sidebarOpen={sidebarOpen} />
        <NavItem to="/integration" icon={Database} label={t('sidebar_integration')} sidebarOpen={sidebarOpen} />

        {isApprover && (
          <>
            {sidebarOpen && <div className="sidebar-section-label">{t('sidebar_approvals')}</div>}
            <NavItem to="/approvals" icon={CheckSquare} label={t('actions')} sidebarOpen={sidebarOpen} />
          </>
        )}

        {(hasAnyRole('ADMIN_DEPARTMENT') || originalAdmin) && (
          <>
            {sidebarOpen && <div className="sidebar-section-label">{t('sidebar_administration')}</div>}
            <NavItem to="/admin/overview" icon={BarChart3} label={t('analytics')} sidebarOpen={sidebarOpen} />
            <NavItem to="/admin/users" icon={Settings} label={t('settings')} sidebarOpen={sidebarOpen} />
          </>
        )}
      </nav>

      {originalAdmin && sidebarOpen && (
        <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
          <button className="btn btn-warning" style={{ width: '100%', fontSize: '0.8rem', height: '32px' }} onClick={handleReturnToAdmin}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> {t('sidebar_return_to_admin')}
          </button>
        </div>
      )}
      {originalAdmin && !sidebarOpen && (
        <div style={{ padding: '0 0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-warning" style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('sidebar_return_to_admin')} onClick={handleReturnToAdmin}>
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      <div 
        className="sidebar-user" 
        style={{ 
          position: 'relative', 
          cursor: isAdmin && !originalAdmin ? 'pointer' : 'default', 
          padding: sidebarOpen ? '1.25rem' : '1.25rem 0.5rem', 
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'background-color 0.2s ease'
        }} 
        ref={dropdownRef} 
        onClick={() => isAdmin && !originalAdmin && setShowImpersonate(!showImpersonate)}
        onMouseEnter={(e) => { if (isAdmin && !originalAdmin) e.currentTarget.style.backgroundColor = 'var(--border-light)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div className="avatar" style={{ border: '1.5px solid var(--border)', fontWeight: 600, color: 'var(--primary)' }}>{initials}</div>
        {sidebarOpen && (
          <>
            <div className="sidebar-user-info" style={{ minWidth: 0, flex: 1 }}>
              <div className="name" style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: 'var(--text-primary)', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                display: 'block'
              }} title={user?.full_name}>
                {user?.full_name}
              </div>
              <div className="role" style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)', 
                fontFamily: 'var(--font-mono)', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                marginTop: '2px'
              }}>
                {primaryRole}
              </div>
            </div>
            {originalAdmin && (
              <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 4px', flexShrink: 0 }}>
                {t('sidebar_viewing_as')}
              </span>
            )}
            <button 
              className="btn btn-ghost" 
              onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
              title={t('logout')} 
              style={{
                flexShrink: 0, 
                width: '32px', 
                height: '32px', 
                padding: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <LogOut size={16} />
            </button>
          </>
        )}

        {showImpersonate && isAdmin && !originalAdmin && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: sidebarOpen ? '0.5rem' : '70px',
            right: sidebarOpen ? '0.5rem' : 'auto',
            width: sidebarOpen ? 'auto' : '220px',
            marginBottom: '0.5rem',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)',
            zIndex: 200,
            padding: '0.5rem',
            maxHeight: '260px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
              {t('sidebar_switch_account')}
            </div>
            {users.map(u => (
              <div 
                key={u.id} 
                onClick={(e) => { e.stopPropagation(); handleImpersonate(u); }}
                style={{
                  padding: '0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem'
                }}
                className="nav-link"
              >
                <div className="avatar avatar-sm" style={{ border: '1px solid var(--border)', fontWeight: 600 }}>{u.first_name?.[0]}{u.last_name?.[0]}</div>
                <div style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.full_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.roles?.[0]?.name?.replace(/_/g, ' ') || 'User'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
