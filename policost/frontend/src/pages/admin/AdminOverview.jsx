import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsApi, departmentsApi, projectsApi, usersApi, expensesApi } from '../../api'
import { PageLoader, EmptyState, StatCard, formatCurrency, ProgressBar } from '../../components/ui'
import ExpenseTimeline from '../../components/charts/ExpenseTimeline'
import CategoryBar from '../../components/charts/CategoryBar'
import { 
  BarChart3, Users, FolderKanban, ShieldAlert, Plus, Edit2, Trash2,
  Eye, UserCheck, ChevronLeft, Search, Calendar, FileText, ArrowRight 
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AdminOverview() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const currentYear = new Date().getFullYear()

  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [categoryData, setCategoryData] = useState([])
  
  // Department management state
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  
  // Drill-down department view state
  const [viewingDept, setViewingDept] = useState(null)
  const [activeDetailTab, setActiveDetailTab] = useState('projects') // 'projects', 'members', 'expenses', 'analytics'
  
  // Search inputs inside tabs
  const [projectSearch, setProjectSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [expenseSearch, setExpenseSearch] = useState('')

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedDept, setSelectedDept] = useState(null)
  
  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '', head_id: '' })
  const [createForm, setCreateForm] = useState({ name: '', code: '', head_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const loadData = async () => {
    try {
      const [overviewRes, timelineRes, catRes, deptsRes, projRes, usersRes, expensesRes] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.timeline(currentYear),
        analyticsApi.byCategory(),
        departmentsApi.list(),
        projectsApi.list({ per_page: 200 }),
        usersApi.list({ per_page: 200 }),
        expensesApi.list({ per_page: 1000 })
      ])
      setOverview(overviewRes.data.data)
      setTimeline(timelineRes.data.data.data)
      setCategoryData(catRes.data.data)
      setDepartments(deptsRes.data.data)
      setProjects(projRes.data.data.items || [])
      setAllUsers(usersRes.data.data.items || [])
      setAllExpenses(expensesRes.data.data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentYear])

  // Get aggregated metrics for a department card
  const departmentMetrics = (deptId) => {
    const deptProjects = projects.filter(p => p.department_id === deptId)
    const totalBudget = deptProjects.reduce((sum, p) => sum + (p.total_budget || 0), 0)
    const spentBudget = deptProjects.reduce((sum, p) => sum + (p.spent_budget || 0), 0)
    const remainingBudget = totalBudget - spentBudget
    const usagePct = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0
    return {
      totalBudget,
      spentBudget,
      remainingBudget,
      usagePct,
      projectsList: deptProjects
    }
  }

  // Drill-down data calculations
  const getDrillDownData = () => {
    if (!viewingDept) return null

    const deptProjects = projects.filter(p => p.department_id === viewingDept.id)
    const deptUsers = allUsers.filter(u => u.department_id === viewingDept.id)
    const deptExpenses = allExpenses.filter(e => {
      const proj = projects.find(p => p.id === e.project_id)
      return proj && proj.department_id === viewingDept.id
    })

    const totalBudget = deptProjects.reduce((sum, p) => sum + (p.total_budget || 0), 0)
    const spentBudget = deptProjects.reduce((sum, p) => sum + (p.spent_budget || 0), 0)
    const remainingBudget = totalBudget - spentBudget
    const usagePct = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0

    // Filter approved vs pending spend
    const approvedSpend = deptExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    const pendingSpend = deptExpenses
      .filter(e => e.status !== 'approved' && e.status !== 'rejected')
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    // Department timeline calculations
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const itMonths = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
    const monthlyTimeline = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      month_label: i18n.language === 'it' ? itMonths[i] : months[i],
      total: 0,
      count: 0
    }))

    deptExpenses.forEach(e => {
      if (!e.expense_date) return
      const d = new Date(e.expense_date)
      if (d.getFullYear() === currentYear && e.status !== 'rejected') {
        const month = d.getMonth()
        monthlyTimeline[month].total += e.amount
        monthlyTimeline[month].count += 1
      }
    })

    // Department category calculations
    const categoryMap = {}
    deptExpenses.forEach(e => {
      if (e.status === 'rejected') return
      const catLabel = e.category ? t(e.category.translationKey || e.category.name) : t('category_other')
      if (!categoryMap[catLabel]) {
        categoryMap[catLabel] = {
          category: catLabel,
          total: 0,
          count: 0
        }
      }
      categoryMap[catLabel].total += e.amount
      categoryMap[catLabel].count += 1
    })
    const deptCategoryBreakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total)

    return {
      projects: deptProjects,
      users: deptUsers,
      expenses: deptExpenses,
      totalBudget,
      spentBudget,
      remainingBudget,
      usagePct,
      approvedSpend,
      pendingSpend,
      monthlyTimeline,
      categoryBreakdown: deptCategoryBreakdown
    }
  }

  const drillDown = getDrillDownData()

  // Handle CRUD opens
  const handleEditOpen = (dept, e) => {
    if (e) e.stopPropagation()
    setSelectedDept(dept)
    setDeptForm({
      name: dept.name,
      code: dept.code,
      head_id: dept.head_id || ''
    })
    setModalError('')
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError('')
    try {
      await departmentsApi.update(selectedDept.id, {
        name: deptForm.name,
        code: deptForm.code.toUpperCase(),
        head_id: deptForm.head_id || null
      })
      const deptsRes = await departmentsApi.list()
      const updatedDepts = deptsRes.data.data
      setDepartments(updatedDepts)
      
      // Update viewing department if it was the one modified
      if (viewingDept && viewingDept.id === selectedDept.id) {
        const updatedViewing = updatedDepts.find(d => d.id === selectedDept.id)
        if (updatedViewing) setViewingDept(updatedViewing)
      }

      setIsEditModalOpen(false)
    } catch (err) {
      console.error(err)
      setModalError(err.response?.data?.message || t('error_updating_department'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDepartment = async (deptId, deptName, e) => {
    if (e) e.stopPropagation()
    const confirmMsg = t('confirm_delete_department', { defaultValue: `Sei sicuro di voler eliminare il dipartimento/ambiente ${deptName}?` })
    if (window.confirm(confirmMsg)) {
      try {
        await departmentsApi.delete(deptId)
        // Refresh data
        loadData()
        setViewingDept(null)
      } catch (err) {
        console.error(err)
        const errMsg = err.response?.data?.message || t('error_deleting_department', { defaultValue: 'Impossibile eliminare il dipartimento/ambiente. Verifica che non abbia progetti attivi.' })
        alert(errMsg)
      }
    }
  }

  const handleCreateOpen = () => {
    setCreateForm({
      name: '',
      code: '',
      head_id: ''
    })
    setModalError('')
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError('')
    try {
      await departmentsApi.create({
        name: createForm.name,
        code: createForm.code.toUpperCase(),
        head_id: createForm.head_id || null
      })
      const deptsRes = await departmentsApi.list()
      setDepartments(deptsRes.data.data)
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error(err)
      setModalError(err.response?.data?.message || t('error_creating_department'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />
  if (!overview) return <EmptyState icon={<BarChart3 size={48} />} title={t('analytics_unavailable')} />

  // -------------------------------------------------------------
  // RENDER DEDICATED DEPARTMENT DRILL-DOWN DASHBOARD
  // -------------------------------------------------------------
  if (viewingDept && drillDown) {
    // Filter projects, members, expenses based on searches
    const filteredProjects = drillDown.projects.filter(p => 
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(projectSearch.toLowerCase())
    )

    const filteredUsers = drillDown.users.filter(u => 
      u.full_name.toLowerCase().includes(memberSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.matricola && u.matricola.toLowerCase().includes(memberSearch.toLowerCase()))
    )

    const filteredExpenses = drillDown.expenses.filter(e => 
      e.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (e.submitter && e.submitter.full_name.toLowerCase().includes(expenseSearch.toLowerCase())) ||
      (e.project && e.project.code.toLowerCase().includes(expenseSearch.toLowerCase()))
    )

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => {
              setViewingDept(null)
              setProjectSearch('')
              setMemberSearch('')
              setExpenseSearch('')
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem', borderRadius: '6px' }}
          >
            <ChevronLeft size={16} /> {t('back_to_departments')}
          </button>
        </div>

        {/* Department Detail Header */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span 
                  style={{ 
                    background: 'var(--primary-glow)', 
                    color: 'var(--primary-light)', 
                    fontWeight: 700, 
                    fontSize: '0.85rem', 
                    padding: '0.3rem 0.75rem', 
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {viewingDept.code}
                </span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {viewingDept.name}
                </h1>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserCheck size={15} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600 }}>{t('head_of_department')}:</span>
                <span style={{ color: viewingDept.head ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {viewingDept.head ? `${viewingDept.head.full_name} (${viewingDept.head.email})` : t('no_head_assigned')}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={(e) => handleEditOpen(viewingDept, e)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={15} /> {t('edit_department')}
              </button>
              <button 
                className="btn btn-danger" 
                onClick={(e) => handleDeleteDepartment(viewingDept.id, viewingDept.name, e)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}
              >
                <Trash2 size={15} /> {t('delete_department', { defaultValue: 'Elimina' })}
              </button>
            </div>
          </div>
        </div>

        {/* Department KPIs Grid */}
        <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
          <StatCard 
            icon={<FolderKanban size={24} />} 
            label={t('total_projects')} 
            value={drillDown.projects.length} 
            variant="primary" 
          />
          <StatCard 
            icon={<Users size={24} />} 
            label={t('total_members')} 
            value={viewingDept.user_count || drillDown.users.length} 
            variant="info" 
          />
          <StatCard 
            icon={<BarChart3 size={24} />} 
            label={t('department_budget')} 
            value={formatCurrency(drillDown.totalBudget)} 
            variant="success" 
            subtitle={`${Math.round(drillDown.usagePct)}% ${t('budget_usage')}`}
          />
          <StatCard 
            icon={<ShieldAlert size={24} />} 
            label={t('department_spent')} 
            value={formatCurrency(drillDown.spentBudget)} 
            variant="warning" 
            subtitle={`${formatCurrency(drillDown.remainingBudget)} ${t('remaining')}`}
          />
        </div>

        {/* Tabs Menu */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1.5rem' }}>
          {[
            { key: 'projects', label: t('tab_projects'), count: drillDown.projects.length },
            { key: 'members', label: t('tab_members'), count: drillDown.users.length },
            { key: 'expenses', label: t('tab_expenses'), count: drillDown.expenses.length },
            { key: 'analytics', label: t('tab_analytics') }
          ].map((tab) => {
            const active = activeDetailTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveDetailTab(tab.key)}
                style={{
                  padding: '0.75rem 0.25rem 0.75rem 0.25rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: 'none',
                  background: 'none',
                  color: active ? 'var(--primary-light)' : 'var(--text-muted)',
                  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s, border-bottom-color 0.2s'
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      background: active ? 'var(--primary-glow)' : 'var(--bg-surface)', 
                      color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 600
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Contents */}
        {activeDetailTab === 'projects' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="search-bar" style={{ maxWidth: '320px', margin: 0 }}>
                <Search className="icon" size={16} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={t('search_project')} 
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <EmptyState icon={<FolderKanban size={40} />} title={t('no_projects_found')} description={t('no_projects_assigned')} />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('project_name')}</th>
                      <th>{t('project_manager')}</th>
                      <th style={{ textAlign: 'right' }}>{t('total_budget')}</th>
                      <th style={{ textAlign: 'right' }}>{t('spent')}</th>
                      <th style={{ textAlign: 'right' }}>{t('remaining')}</th>
                      <th>{t('budget_usage')}</th>
                      <th>{t('status')}</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => {
                      const usage = p.total_budget > 0 ? (p.spent_budget / p.total_budget) * 100 : 0
                      return (
                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.code}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{p.manager ? p.manager.full_name : '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.manager?.email}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(p.total_budget)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>{formatCurrency(p.spent_budget)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: p.remaining_budget < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {formatCurrency(p.remaining_budget)}
                          </td>
                          <td style={{ minWidth: '130px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1 }}><ProgressBar value={p.spent_budget} max={p.total_budget} /></div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{Math.round(usage)}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${p.status}`}>
                              {t(`status_${p.status}`)}
                            </span>
                          </td>
                          <td>
                            <ArrowRight size={16} className="text-muted" style={{ opacity: 0.5 }} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'members' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div className="search-bar" style={{ maxWidth: '320px', margin: 0 }}>
                <Search className="icon" size={16} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={t('search_member')} 
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <EmptyState icon={<Users size={40} />} title={t('no_members_found')} />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('user')}</th>
                      <th>{t('matricola', { defaultValue: 'Matricola' })}</th>
                      <th>{t('staff_type', { defaultValue: 'Staff Type' })}</th>
                      <th>{t('roles', { defaultValue: 'Roles' })}</th>
                      <th>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.matricola || '—'}</td>
                        <td>
                          <span className="badge badge-draft" style={{ background: 'var(--bg-surface)' }}>
                            {t(`staff_${u.staff_type}`, { defaultValue: u.staff_type })}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {u.roles?.map(r => (
                              <span key={r.id} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                                {r.name.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${u.is_active ? 'active' : 'closed'}`}>
                            {u.is_active ? t('status_active', 'Active') : t('status_inactive', 'Inactive')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'expenses' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div className="search-bar" style={{ maxWidth: '320px', margin: 0 }}>
                <Search className="icon" size={16} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={t('search_expense')} 
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <EmptyState icon={<ShieldAlert size={40} />} title={t('no_expenses_found')} />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('expense_details')}</th>
                      <th>{t('project')}</th>
                      <th>{t('submitter', { defaultValue: 'Submitter' })}</th>
                      <th>{t('category')}</th>
                      <th style={{ textAlign: 'right' }}>{t('amount')}</th>
                      <th>{t('status')}</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/expenses/${e.id}`)}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {e.expense_date}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.project?.code}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.project?.name}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{e.submitter ? e.submitter.full_name : '—'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.submitter?.email}</div>
                        </td>
                        <td>
                          <span className="badge badge-draft" style={{ background: 'var(--bg-surface)' }}>
                            {e.category ? t(e.category.translationKey || e.category.name) : t('category_other')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {formatCurrency(e.amount)}
                        </td>
                        <td>
                          <span className={`badge badge-${e.status}`}>
                            {t(`status_${e.status}`)}
                          </span>
                        </td>
                        <td>
                          <ArrowRight size={16} className="text-muted" style={{ opacity: 0.5 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'analytics' && (
          <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {t('department_spend_timeline')} ({viewingDept.code})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {t('approved_pending_expenses_for')} {currentYear}
                </p>
              </div>
              <ExpenseTimeline data={drillDown.monthlyTimeline} height={320} />
            </div>

            <div className="card">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {t('spend_by_category')} ({viewingDept.code})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {t('all_time_distribution')}
                </p>
              </div>
              <CategoryBar data={drillDown.categoryBreakdown} height={320} />
            </div>
          </div>
        )}

        {/* Edit Department Modal inside Drill-Down view */}
        {isEditModalOpen && selectedDept && (
          <div className="modal-backdrop" style={{
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="modal-content card" style={{
              width: '100%', maxWidth: '450px', padding: '2rem', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
              display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {t('edit_department')} ({selectedDept.code})
                </h2>
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ fontSize: '1.5rem', padding: '0 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  ×
                </button>
              </div>

              {modalError && (
                <div className="alert alert-danger" style={{ 
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', 
                  background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem'
                }}>
                  {modalError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('department_name')} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('department_code')} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('head_of_department')}
                  </label>
                  <select
                    className="form-control"
                    value={deptForm.head_id}
                    onChange={(e) => setDeptForm({ ...deptForm, head_id: e.target.value })}
                  >
                    <option value="">{t('assign_head')}</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={submitting}
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={submitting}
                  >
                    {submitting ? t('saving') : t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER GLOBAL ANNOTATED OVERVIEW & DEPARTMENT GRID
  // -------------------------------------------------------------
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('departments_management')}</h1>
          <p>{t('analytics_desc')}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreateOpen}>
            <Plus size={18} /> {t('new_department')}
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard 
          icon={<BarChart3 size={24} />} 
          label={t('total_approved_spend')} 
          value={formatCurrency(overview.approved_amount)} 
          variant="success" 
          subtitle={`${overview.total_expenses} ${t('total_requests')}`}
        />
        <StatCard 
          icon={<FolderKanban size={24} />} 
          label={t('active_projects')} 
          value={overview.active_projects} 
          variant="primary" 
        />
        <StatCard 
          icon={<ShieldAlert size={24} />} 
          label={t('pending_rejected')} 
          value={`${overview.pending_count} / ${overview.rejected_count}`} 
          variant="warning" 
        />
        <StatCard 
          icon={<Users size={24} />} 
          label={t('active_users')} 
          value={overview.total_users} 
          variant="info" 
        />
      </div>

      {/* Departments Administration Section */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {t('departments_management')}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              {t('departments_management_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {departments.map((dept) => {
            const metrics = departmentMetrics(dept.id)
            return (
              <div 
                key={dept.id} 
                className="card" 
                onClick={() => {
                  setViewingDept(dept)
                  setActiveDetailTab('projects')
                }}
                style={{ 
                  padding: '1.25rem', 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span 
                      style={{ 
                        background: 'var(--primary-glow)', 
                        color: 'var(--primary-light)', 
                        fontWeight: 700, 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {dept.code}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                      {dept.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 500 }}>{t('head_of_department')}:</span>
                      <span style={{ color: dept.head ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {dept.head ? dept.head.full_name : t('no_head_assigned')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-icon btn-ghost btn-sm" 
                      title={t('edit')} 
                      onClick={(e) => handleEditOpen(dept, e)}
                      style={{ padding: '0.4rem', borderRadius: '6px' }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      className="btn btn-icon btn-ghost btn-sm text-danger" 
                      title={t('delete')} 
                      onClick={(e) => handleDeleteDepartment(dept.id, dept.name, e)}
                      style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: '0.75rem', fontSize: '0.8rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('total_projects')}:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>{metrics.projectsList.length}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{t('total_members')}:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>{dept.user_count || 0}</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('budget_usage')}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', float: 'right' }}>{Math.round(metrics.usagePct)}%</span>
                  </div>
                  <ProgressBar value={metrics.spentBudget} max={metrics.totalBudget} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t('department_budget')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{formatCurrency(metrics.totalBudget)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t('department_spent')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{formatCurrency(metrics.spentBudget)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('department_spend_timeline')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('approved_pending_expenses_for')} {currentYear}</p>
          </div>
          <ExpenseTimeline data={timeline} height={320} />
        </div>

        <div className="card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('spend_by_category')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('all_time_distribution')}</p>
          </div>
          <CategoryBar data={categoryData} height={320} />
        </div>
      </div>

      {/* Edit Department Modal inside General list view */}
      {isEditModalOpen && selectedDept && (
        <div className="modal-backdrop" style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="modal-content card" style={{
            width: '100%', maxWidth: '450px', padding: '2rem', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {t('edit_department')} ({selectedDept.code})
              </h2>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={() => setIsEditModalOpen(false)}
                style={{ fontSize: '1.5rem', padding: '0 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            {modalError && (
              <div className="alert alert-danger" style={{ 
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', 
                background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('department_name')} *
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('department_code')} *
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('head_of_department')}
                </label>
                <select
                  className="form-control"
                  value={deptForm.head_id}
                  onChange={(e) => setDeptForm({ ...deptForm, head_id: e.target.value })}
                >
                  <option value="">{t('assign_head')}</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting}
                >
                  {submitting ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="modal-content card" style={{
            width: '100%', maxWidth: '450px', padding: '2rem', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {t('new_department')}
              </h2>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={() => setIsCreateModalOpen(false)}
                style={{ fontSize: '1.5rem', padding: '0 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            {modalError && (
              <div className="alert alert-danger" style={{ 
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', 
                background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('department_name')} *
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Dept. of Energy"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('department_code')} *
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. DENERG"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('head_of_department')}
                </label>
                <select
                  className="form-control"
                  value={createForm.head_id}
                  onChange={(e) => setCreateForm({ ...createForm, head_id: e.target.value })}
                >
                  <option value="">{t('assign_head')}</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting}
                >
                  {submitting ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
