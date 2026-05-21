import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectsApi, usersApi } from '../../api'
import { PageLoader, EmptyState, StatusBadge, formatCurrency, formatDate, ProgressBar } from '../../components/ui'
import BudgetDonut from '../../components/charts/BudgetDonut'
import CategoryBar from '../../components/charts/CategoryBar'
import { ArrowLeft, Edit, Receipt, Calendar, Users, BarChart3, Clock, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole, user } = useAuthStore()
  const { t } = useTranslation()
  
  const [project, setProject] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [teamMembers, setTeamMembers] = useState([])

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    funding_source: '',
    status: '',
    total_budget: '',
    manager_id: ''
  })
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (project) {
      setEditForm({
        name: project.name || '',
        description: project.description || '',
        funding_source: project.funding_source || '',
        status: project.status || 'active',
        total_budget: project.total_budget || '',
        manager_id: project.manager_id || ''
      })
    }
  }, [project])

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        funding_source: editForm.funding_source,
        status: editForm.status
      }
      if (hasRole('ADMIN_DEPARTMENT')) {
        payload.total_budget = parseFloat(editForm.total_budget)
        payload.manager_id = parseInt(editForm.manager_id)
      }
      
      await projectsApi.update(id, payload)
      toast.success(t('project_updated_success', { defaultValue: 'Project updated successfully!' }))
      setIsEditModalOpen(false)
      
      // Reload project details
      const projRes = await projectsApi.get(id)
      setProject(projRes.data.data)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || t('error_updating_project', { defaultValue: 'Error updating project' }))
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, expRes, usersRes] = await Promise.all([
          projectsApi.get(id),
          projectsApi.expenses(id, { per_page: 10 }),
          usersApi.list({ per_page: 100 })
        ])
        setProject(projRes.data.data)
        setExpenses(expRes.data.data.items || [])
        setAllUsers(usersRes.data.data.items || [])
        
        // Filter users to mock team members for this project's department
        const deptUsers = (usersRes.data.data.items || []).filter(
          u => u.department_id === projRes.data.data.department_id
        )
        setTeamMembers(deptUsers)
      } catch (err) {
        console.error(err)
        navigate('/projects')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, navigate])

  if (loading) return <PageLoader />
  if (!project) return <EmptyState title={t('project_not_found', { defaultValue: 'Project not found' })} />

  const { budget_summary } = project
  const catData = budget_summary?.categories?.map(c => ({
    category: c.category.name,
    total: c.spent,
    allocated: c.allocated
  })) || []

  // Gantt chart work packages mock data
  const workPackages = [
    { code: 'WP1', title: 'Management & Coordination', start: 1, end: 36, progress: 80, status: 'active', leader: project.manager?.full_name || 'Mario Rossi' },
    { code: 'WP2', title: 'State of the Art & Requirements', start: 1, end: 8, progress: 100, status: 'completed', leader: 'Silvia Conti' },
    { code: 'WP3', title: 'Algorithm Design & Coding', start: 6, end: 24, progress: 65, status: 'active', leader: 'Luca Verdi' },
    { code: 'WP4', title: 'System Validation & Field Trial', start: 18, end: 30, progress: 15, status: 'active', leader: 'Elena Bianchi' },
    { code: 'WP5', title: 'Dissemination & Policy Briefs', start: 12, end: 36, progress: 40, status: 'active', leader: 'Anna Ferrari' },
  ]

  // Milestones list
  const milestones = [
    { month: 'M01', desc: 'Kick-off meeting and Project Plan release', done: true },
    { month: 'M08', desc: 'D2.1 - User requirements and technical architecture specification', done: true },
    { month: 'M18', desc: 'D3.1 - Core AI prediction modules release', done: true },
    { month: 'M24', desc: 'D3.2 - Final integration of algorithms', done: false },
    { month: 'M30', desc: 'D4.1 - Validation report from pilot users', done: false },
  ]

  // FTE Allocations mock data matching staff types
  const getFteAllocation = (staffType) => {
    switch(staffType) {
      case 'professor_ordinario': return '30%';
      case 'professor_associato': return '40%';
      case 'researcher': return '60%';
      case 'post_doc': return '100%';
      case 'phd_student': return '100%';
      default: return '50%';
    }
  }

  const getLoggedHours = (staffType) => {
    switch(staffType) {
      case 'post_doc': return '364 ' + t('hours');
      case 'phd_student': return '420 ' + t('hours');
      case 'researcher': return '180 ' + t('hours');
      default: return '85 ' + t('hours');
    }
  }

  const canEdit = hasRole('ADMIN_DEPARTMENT') || 
    (hasRole('PROJECT_MANAGER') && project.department_id === user?.department_id) || 
    project.manager_id === user?.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ alignItems: 'center', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {project.name}
              <StatusBadge status={project.status} />
            </h1>
            <p>{project.code} • {project.department?.name} • {t('managed_by')} {project.manager?.full_name}</p>
          </div>
        </div>
        <div className="page-header-actions">
          {canEdit && (
            <button className="btn btn-ghost" onClick={() => setIsEditModalOpen(true)}>
              <Edit size={16} /> {t('edit_project')}
            </button>
          )}
        </div>
      </div>

      {/* Main Budget Stats Card Grid */}
      <div className="grid grid-3">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.75rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{t('total_budget')}</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(project.total_budget)}</div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('spent')}: {formatCurrency(project.spent_budget)}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round((project.spent_budget / project.total_budget) * 100)}%</span>
            </div>
            <ProgressBar value={project.spent_budget} max={project.total_budget} />
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', gap: '2rem', alignItems: 'center', padding: '1.75rem' }}>
          <div style={{ width: '160px', height: '150px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BudgetDonut spent={project.spent_budget} remaining={project.remaining_budget} height={150} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              {t('project_details')}
            </h3>
            <div className="grid grid-2" style={{ gap: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('start_date')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{formatDate(project.start_date)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('end_date')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{formatDate(project.end_date)}</div>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Clock size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('funding_source')}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{project.funding_source || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} 
          onClick={() => setActiveTab('overview')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <BarChart3 size={15} /> {t('expense_reporting')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'gantt' ? 'active' : ''}`} 
          onClick={() => setActiveTab('gantt')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Calendar size={15} /> {t('gantt_chart')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`} 
          onClick={() => setActiveTab('team')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Users size={15} /> {t('team_members')} ({teamMembers.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-2" style={{ gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
          {/* Category Breakdown */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('spend_by_category')}</h3>
            <CategoryBar data={catData} height={300} />
          </div>

          {/* Recent Project Expenses */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('recent_expenses')}</h3>
              <Link to="/expenses" className="btn btn-ghost btn-sm">{t('view_all')}</Link>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {expenses.length === 0 ? (
                <EmptyState title={t('no_expenses_yet')} />
              ) : (
                expenses.map(expense => (
                  <div key={expense.id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', alignItems: 'center', border: '1px solid var(--border-light)' }}>
                    <div style={{ background: 'var(--primary-glow)', color: 'var(--primary-light)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <Receipt size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Link to={`/expenses/${expense.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{expense.title}</Link>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {expense.submitter?.full_name} • {formatDate(expense.expense_date)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {formatCurrency(expense.amount)}
                      </div>
                      <StatusBadge status={expense.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gantt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gantt Chart Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('timeline_wp')}</h3>
            
            {/* Timeline Header Grid */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-strong)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '250px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('wp_task')}</div>
              <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                {[1, 6, 12, 18, 24, 30, 36].map((month) => (
                  <div key={month} style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', borderLeft: '1px dashed var(--border-light)', height: '100%' }}>
                    M{month < 10 ? `0${month}` : month}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {workPackages.map((wp) => {
                const totalMonths = 36
                const startPercent = ((wp.start - 1) / totalMonths) * 100
                const widthPercent = ((wp.end - wp.start + 1) / totalMonths) * 100
                const isCompleted = wp.progress === 100

                return (
                  <div key={wp.code} style={{ display: 'flex', alignItems: 'center' }}>
                    {/* WP Info */}
                    <div style={{ width: '250px', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{wp.code}</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{wp.title}</strong>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('lead')}: {wp.leader}</span>
                    </div>

                    {/* WP Timeline Bar Container */}
                    <div style={{ flex: 1, height: '36px', background: 'var(--bg-surface)', borderRadius: '6px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', border: '1px solid var(--border-light)' }}>
                      {/* Grid overlay lines */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                        {[...Array(6)].map((_, i) => (
                          <div key={i} style={{ flex: 1, borderRight: '1px dashed rgba(0,0,0,0.03)' }} />
                        ))}
                      </div>

                      {/* Actual Task bar */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                          height: '24px',
                          background: isCompleted ? 'rgba(31,138,101,0.1)' : 'var(--primary-glow)',
                          border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--primary)'}`,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 8px',
                          fontSize: '0.75rem',
                          color: isCompleted ? 'var(--success)' : 'var(--primary-active)',
                          fontWeight: 600
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          M{wp.start}-M{wp.end} • {wp.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Milestones Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} color="var(--primary)" /> {t('project_milestones')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {milestones.map((ms, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.5rem 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, padding: '2px 8px', background: 'var(--primary-glow)', borderRadius: '4px', marginTop: '2px' }}>
                    {ms.month}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{ms.desc}</p>
                  </div>
                  <span 
                    className="badge" 
                    style={{ 
                      borderColor: ms.done ? 'var(--success)' : 'var(--border-strong)', 
                      color: ms.done ? 'var(--success)' : 'var(--text-muted)',
                      fontSize: '11px',
                      padding: '2px 8px'
                    }}
                  >
                    {ms.done ? t('reached') : t('planned')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('researchers_allocated')}</h3>
          
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('person')}</th>
                  <th>{t('qualification')}</th>
                  <th>{t('email')}</th>
                  <th>{t('project_fte')}</th>
                  <th>{t('logged_hours')}</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {t('no_team_members')}
                    </td>
                  </tr>
                ) : (
                  teamMembers.map(member => (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--bg-surface)' }}>
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <strong>{member.full_name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ fontSize: '11px' }}>
                          {t(member.staff_type) || member.staff_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{member.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{getFteAllocation(member.staff_type)}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('of_time')}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="var(--text-muted)" />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            {getLoggedHours(member.staff_type)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="modal-content card" style={{
            width: '100%',
            maxWidth: '550px',
            padding: '2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {t('edit_project')}
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

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('project_name', { defaultValue: 'Project Name' })}
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('funding_source')}
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.funding_source}
                  onChange={(e) => setEditForm({ ...editForm, funding_source: e.target.value })}
                />
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('status')}
                  </label>
                  <select
                    className="form-control"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="draft">{t('status_draft_proj')}</option>
                    <option value="active">{t('status_active')}</option>
                    <option value="suspended">{t('status_suspended')}</option>
                    <option value="closed">{t('status_closed')}</option>
                  </select>
                </div>

                {hasRole('ADMIN_DEPARTMENT') && (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      {t('total_budget')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      value={editForm.total_budget}
                      onChange={(e) => setEditForm({ ...editForm, total_budget: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {hasRole('ADMIN_DEPARTMENT') && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('project_manager', { defaultValue: 'Project Manager' })}
                  </label>
                  <select
                    className="form-control"
                    required
                    value={editForm.manager_id}
                    onChange={(e) => setEditForm({ ...editForm, manager_id: e.target.value })}
                  >
                    <option value="">{t('select_manager', { defaultValue: 'Select a Manager...' })}</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('description')}
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  style={{ resize: 'vertical' }}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={updating}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
