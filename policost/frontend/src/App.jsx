import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ExpenseList from './pages/expenses/ExpenseList'
import ExpenseDetail from './pages/expenses/ExpenseDetail'
import NewExpense from './pages/expenses/NewExpense'
import ProjectList from './pages/projects/ProjectList'
import ProjectDetail from './pages/projects/ProjectDetail'
import ApprovalQueue from './pages/approvals/ApprovalQueue'
import UserManagement from './pages/admin/UserManagement'
import AdminOverview from './pages/admin/AdminOverview'
import Personnel from './pages/Personnel'
import DataIntegration from './pages/DataIntegration'

function ProtectedRoute({ children, roles }) {
  const { user, hasAnyRole } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !hasAnyRole(...roles)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="expenses/new" element={<NewExpense />} />
          <Route path="expenses/:id" element={<ExpenseDetail />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="personnel" element={<Personnel />} />
          <Route path="integration" element={<DataIntegration />} />
          <Route path="approvals" element={
            <ProtectedRoute roles={['ADMIN_DEPARTMENT','PROJECT_MANAGER','FINANCIAL_APPROVER']}>
              <ApprovalQueue />
            </ProtectedRoute>
          } />
          <Route path="admin/users" element={
            <ProtectedRoute roles={['ADMIN_DEPARTMENT']}>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="admin/overview" element={
            <ProtectedRoute roles={['ADMIN_DEPARTMENT','FINANCIAL_APPROVER']}>
              <AdminOverview />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
