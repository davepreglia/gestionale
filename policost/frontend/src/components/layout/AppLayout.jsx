import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuthStore } from '../../store/authStore'

export default function AppLayout() {
  const sidebarOpen = useAuthStore(s => s.sidebarOpen)

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <Header />
        <main className="page-body fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
