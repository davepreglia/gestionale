import { useState, useEffect } from 'react'
import { usersApi, projectsApi, departmentsApi } from '../api'
import { PageLoader, EmptyState, formatCurrency } from '../components/ui'
import { Search, Mail, Briefcase, Award, Percent, BookOpen, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

export default function Personnel() {
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedStaffType, setSelectedStaffType] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const { t } = useTranslation()

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, projectsRes, deptRes] = await Promise.all([
          usersApi.list({ per_page: 100 }),
          projectsApi.list({ per_page: 100 }),
          departmentsApi.list()
        ])
        setUsers(usersRes.data.data.items || [])
        setProjects(projectsRes.data.data.items || [])
        setDepartments(deptRes.data.data || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <PageLoader />

  // Staff type translations
  const staffTypeMap = {
    professor_ordinario: { label: t('professor_ordinario'), color: 'var(--primary)', fte: '100%' },
    professor_associato: { label: t('professor_associato'), color: 'var(--warning)', fte: '100%' },
    researcher: { label: t('researcher'), color: 'var(--success)', fte: '80%' },
    phd_student: { label: t('phd_student'), color: 'var(--info)', fte: '100%' },
    post_doc: { label: t('post_doc'), color: 'var(--primary-light)', fte: '100%' },
    contractor: { label: t('contractor'), color: 'var(--text-muted)', fte: '50%' },
    admin_tab: { label: t('admin_tab'), color: 'var(--text-body)', fte: '100%' }
  }

  const getPresaServizio = (type) => {
    return type === 'professor_ordinario' || type === 'professor_associato' ? '01/03/2024' : '01/01/2024'
  }
  const getFineContratto = (type) => {
    return type === 'professor_ordinario' || type === 'professor_associato' || type === 'admin_tab' ? null : '31/12/2025'
  }
  const getCostoOrario = (type) => {
    if (type === 'professor_ordinario') return formatCurrency(45)
    if (type === 'professor_associato') return formatCurrency(35)
    if (type === 'researcher') return formatCurrency(30)
    if (type === 'post_doc') return formatCurrency(25)
    if (type === 'phd_student') return formatCurrency(15)
    return formatCurrency(20)
  }
  const getOreAllocate = (type) => {
    return type === 'post_doc' || type === 'phd_student' ? '480' : '320'
  }
  const getOreProgrammate = (type) => {
    return type === 'post_doc' || type === 'phd_student' ? '600' : '400'
  }
  const getCostoProgetto = (type) => {
    if (type === 'professor_ordinario') return formatCurrency(14400)
    if (type === 'professor_associato') return formatCurrency(11200)
    if (type === 'researcher') return formatCurrency(9600)
    if (type === 'post_doc') return formatCurrency(12000)
    if (type === 'phd_student') return formatCurrency(7200)
    return formatCurrency(6400)
  }
  const getWpBreakdown = (type) => {
    if (type === 'professor_ordinario' || type === 'professor_associato') return `WP1: ${formatCurrency(7200)}, WP2: ${formatCurrency(7200)}`
    return `WP1: ${formatCurrency(7200)}, WP2: ${formatCurrency(4800)}`
  }
  const getMissioniConteggio = (type) => {
    return type === 'professor_ordinario' || type === 'professor_associato' ? '2 (da UGOV / Missioni online)' : '1 (da UGOV / Missioni online)'
  }

  // Helper to find projects managed by a user
  const getUserProjects = (userId) => {
    return projects.filter(p => p.manager_id === userId)
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.matricola && user.matricola.includes(searchTerm))
    const matchesDept = selectedDept ? user.department_id === parseInt(selectedDept) : true
    const matchesStaffType = selectedStaffType ? user.staff_type === selectedStaffType : true
    
    return matchesSearch && matchesDept && matchesStaffType
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>{t('personnel_management')}</h1>
          <p>{t('personnel_desc')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={18} className="icon" />
          <input 
            type="text" 
            placeholder={t('search_personnel_placeholder')} 
            className="form-control"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="form-control" 
          style={{ width: '200px' }}
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="">{t('all_departments')}</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
          ))}
        </select>

        <select 
          className="form-control" 
          style={{ width: '220px' }}
          value={selectedStaffType}
          onChange={(e) => setSelectedStaffType(e.target.value)}
        >
          <option value="">{t('all_qualifications')}</option>
          {Object.entries(staffTypeMap).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <EmptyState title={t('no_personnel_found')} description={t('adjust_personnel_filters')} />
      ) : (
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {filteredUsers.map(user => {
            const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
            const userProjs = getUserProjects(user.id)
            const staffType = staffTypeMap[user.staff_type] || { label: user.staff_type, color: 'var(--text-muted)', fte: '100%' }
            
            return (
              <div 
                className="card nav-link" 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                style={{ 
                  padding: '1.75rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.25rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)',
                  textAlign: 'left',
                  alignItems: 'stretch',
                  background: 'var(--bg-card)',
                  height: 'auto',
                  cursor: 'pointer'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="avatar avatar-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.full_name}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ borderColor: staffType.color, color: staffType.color, fontSize: '11px', padding: '2px 8px' }}>
                        {staffType.label}
                      </span>
                      {user.matricola && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {t('matricola')}: {user.matricola}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-body)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>{t('department')}: <strong>{user.department?.name || '—'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>{t('research_fte')}: <strong>{staffType.fte}</strong></span>
                  </div>
                </div>

                {/* Assigned Projects */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BookOpen size={12} />
                    {t('managed_projects')} ({userProjs.length})
                  </div>
                  {userProjs.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('no_managed_projects')}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {userProjs.map(proj => (
                        <span key={proj.id} className="badge" style={{ background: 'var(--bg-surface)', fontSize: '11px', padding: '3px 8px' }} title={proj.name}>
                          {proj.code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>{selectedUser.full_name} — {t('personnel_card')}</h2>
              <button 
                className="btn btn-icon btn-ghost btn-sm" 
                onClick={() => setSelectedUser(null)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="avatar avatar-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
                  {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedUser.full_name}</h3>
                  <span className="badge" style={{ marginTop: '4px', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                    {staffTypeMap[selectedUser.staff_type]?.label || selectedUser.staff_type}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', fontSize: '0.9rem', color: 'var(--text-body)' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('start_date')}:</span>
                  <strong>{getPresaServizio(selectedUser.staff_type)}</strong>
                </p>
                {getFineContratto(selectedUser.staff_type) && (
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('end_date')}:</span>
                    <strong>{getFineContratto(selectedUser.staff_type)}</strong>
                  </p>
                )}
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('call')}:</span>
                  <strong>Horizon Europe 2023</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('fund')}:</span>
                  <strong>Fondo HE-GIGAGREEN 2023 – 60_RE24GA01</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('hourly_cost')}:</span>
                  <strong>{getCostoOrario(selectedUser.staff_type)} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>{t('linked_to_scheme')}</span></strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('allocated_hours')}:</span>
                  <strong>{getOreAllocate(selectedUser.staff_type)} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>{t('from_ts')}</span></strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('planned_hours')}:</span>
                  <strong>{getOreProgrammate(selectedUser.staff_type)} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>{t('planned_annotation')}</span></strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('project_cost')}:</span>
                  <strong>{getCostoProgetto(selectedUser.staff_type)}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('wp_cost')}:</span>
                  <strong>{getWpBreakdown(selectedUser.staff_type)}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('completed_missions')}:</span>
                  <strong>{getMissioniConteggio(selectedUser.staff_type)}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <a 
                  href="#" 
                  className="btn btn-primary" 
                  onClick={(e) => { e.preventDefault(); toast.success('Download dei documenti contrattuali avviato...'); }} 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {t('download_contracts')}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
