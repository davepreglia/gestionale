import { useLocation } from 'react-router-dom'
import { Bell, Globe, Menu, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'

const PAGE_TITLES = {
  '/': ['dashboard', 'Welcome back'],
  '/expenses': ['expenses', 'Track and manage your expenses'],
  '/expenses/new': ['expenses', 'Submit a new expense request'],
  '/projects': ['projects', 'View budgets and project details'],
  '/approvals': ['actions', 'Review and act on pending requests'],
  '/admin/users': ['settings', 'Manage team members and roles'],
  '/admin/overview': ['dashboard', 'Department-wide financial analytics'],
}

export default function Header() {
  const { pathname } = useLocation()
  const { user, sidebarOpen, toggleSidebar } = useAuthStore()
  const { t, i18n } = useTranslation()
  
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'it' ? 'en' : 'it'
    i18n.changeLanguage(nextLang)
    localStorage.setItem('language', nextLang)
  }

  const base = '/' + pathname.split('/')[1]
  const [titleKey, subtitle] = PAGE_TITLES[base] ?? PAGE_TITLES[pathname] ?? ['dashboard', '']

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button 
          onClick={toggleSidebar} 
          className="btn btn-ghost" 
          style={{ padding: '6px', minWidth: 'auto', height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: 'transparent' }}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
        <div className="header-title">{t(titleKey) || titleKey}</div>
      </div>
      <div className="header-spacer" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button 
          className="btn btn-ghost" 
          onClick={toggleLanguage} 
          title={`Switch to ${i18n.language === 'it' ? 'English' : 'Italiano'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
        >
          <Globe size={18} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>{i18n.language.toUpperCase()}</span>
        </button>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {user?.department?.code && (
            <span style={{
              background: 'var(--primary-glow)', color: 'var(--primary-light)',
              padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600
            }}>
              {user.department.code}
            </span>
          )}
        </div>
        <div className="avatar avatar-sm">{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
      </div>
    </header>
  )
}
