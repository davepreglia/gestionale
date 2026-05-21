import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { projectsApi, departmentsApi, usersApi } from '../../api'
import { PageLoader, EmptyState, StatusBadge, formatCurrency, formatDate, ProgressBar } from '../../components/ui'
import { FolderKanban, Plus, Search } from 'lucide-react'

import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'

export default function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { hasRole } = useAuthStore()
  const { t } = useTranslation()

  // New project creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    department_id: '',
    manager_id: '',
    total_budget: '',
    funding_source: '',
    start_date: '',
    end_date: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true)
    setError('')
    try {
      const [deptRes, usersRes] = await Promise.all([
        departmentsApi.list(),
        usersApi.list({ per_page: 100 })
      ])
      setDepartments(deptRes.data.data)
      setUsers(usersRes.data.data.items || [])
    } catch (err) {
      console.error(err)
      setError(t('error_loading_data', 'Error loading department or user list.'))
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await projectsApi.create({
        name: createForm.name,
        code: createForm.code,
        department_id: createForm.department_id,
        manager_id: createForm.manager_id,
        total_budget: Number(createForm.total_budget),
        funding_source: createForm.funding_source || null,
        start_date: createForm.start_date || null,
        end_date: createForm.end_date || null,
        description: createForm.description || ''
      })
      
      // Reload projects list
      const { data } = await projectsApi.list()
      setProjects(data.data.items)
      
      // Reset form and close modal
      setCreateForm({
        name: '',
        code: '',
        department_id: '',
        manager_id: '',
        total_budget: '',
        funding_source: '',
        start_date: '',
        end_date: '',
        description: ''
      })
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || t('error_creating_project', 'Error creating project.'))
    } finally {
      setSubmitting(false)
    }
  }


  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      try {
        const { data } = await projectsApi.list()
        setProjects(data.data.items)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('projects')}</h1>
          <p>{t('manage_projects')}</p>
        </div>
        <div className="page-header-actions">
          {hasRole('ADMIN_DEPARTMENT') && (
            <button className="btn btn-primary" onClick={handleOpenCreateModal}><Plus size={18} /> {t('new_project')}</button>
          )}
        </div>

      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <Search className="icon" size={18} />
          <input 
            type="text" 
            className="form-control" 
            placeholder={t('search_projects')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filteredProjects.length === 0 ? (
        <EmptyState 
          icon={<FolderKanban size={48} />} 
          title={t('no_projects_found')} 
          description={t('no_projects_matching')} 
        />
      ) : (
        <div className="grid grid-3">
          {filteredProjects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
              <div className="card stat-card" style={{ padding: '1.25rem', height: '100%', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'var(--primary-glow)', color: 'var(--primary-light)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                    <FolderKanban size={20} />
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {project.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  {project.code} • {project.department?.code}
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('budget_usage')}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {Math.round((project.spent_budget / project.total_budget) * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={project.spent_budget} max={project.total_budget} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>{t('spent')}</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(project.spent_budget)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)' }}>{t('remaining')}</div>
                      <div style={{ fontWeight: 600, color: project.remaining_budget < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatCurrency(project.remaining_budget)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {/* Create Project Modal */}
      {isCreateModalOpen && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
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
                {t('new_project')}
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

            {error && (
              <div className="alert alert-danger" style={{ 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-sm)', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--danger)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '0.85rem'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('project_name', { defaultValue: 'Project Name' })} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('project_code', { defaultValue: 'Project Code' })} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. GIGAGREEN"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('department')} *
                  </label>
                  <select
                    className="form-control"
                    required
                    value={createForm.department_id}
                    onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                  >
                    <option value="">{t('select_department', { defaultValue: 'Select a Department...' })}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('project_manager', { defaultValue: 'Project Manager' })} *
                  </label>
                  <select
                    className="form-control"
                    required
                    value={createForm.manager_id}
                    onChange={(e) => setCreateForm({ ...createForm, manager_id: e.target.value })}
                  >
                    <option value="">{t('select_manager', { defaultValue: 'Select a Manager...' })}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('total_budget')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    required
                    value={createForm.total_budget}
                    onChange={(e) => setCreateForm({ ...createForm, total_budget: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('funding_source')}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={createForm.funding_source}
                    onChange={(e) => setCreateForm({ ...createForm, funding_source: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('start_date', { defaultValue: 'Start Date' })}
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    {t('end_date', { defaultValue: 'End Date' })}
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  {t('description', { defaultValue: 'Description' })}
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
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

