import { useState, useEffect } from 'react'
import { usersApi } from '../../api'
import { PageLoader, EmptyState, Modal, Spinner } from '../../components/ui'
import { Users, Search, Plus, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { t } = useTranslation()

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    email: '', password: '', first_name: '', last_name: '', staff_type: 'researcher', matricola: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await usersApi.list({ q: search, per_page: 50 })
      setUsers(data.data.items)
    } catch (err) {
      toast.error(t('failed_load_users', 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await usersApi.create(formData)
      toast.success(t('user_created_success', 'User created successfully'))
      setShowModal(false)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_create_user', 'Failed to create user'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleToggle = async (userId, roleName, hasRole) => {
    try {
      if (hasRole) {
        await usersApi.removeRole(userId, roleName)
        toast.success(t('role_removed_success', 'Role {{role}} removed', { role: t(roleName) }))
      } else {
        await usersApi.assignRole(userId, roleName)
        toast.success(t('role_assigned_success', 'Role {{role}} assigned', { role: t(roleName) }))
      }
      loadUsers()
    } catch (err) {
      toast.error(t('failed_update_roles', 'Failed to update roles'))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('admin_control_center', 'Admin Control Center')}</h1>
          <p>{t('admin_control_center_desc', 'Global platform administration, user management, and configuration')}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => {
            setFormData({ email: '', password: '', first_name: '', last_name: '', staff_type: 'researcher', matricola: '' })
            setShowModal(true)
          }}>
            <Plus size={18} /> {t('new_user', 'New User')}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <Search className="icon" size={18} />
          <input 
            type="text" 
            className="form-control" 
            placeholder={t('search_by_name_email', 'Search by name or email...')} 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <PageLoader />
        ) : users.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title={t('no_users_found', 'No users found')} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('user', 'User')}</th>
                  <th>{t('matricola', 'Matricola')}</th>
                  <th>{t('staff_type', 'Staff Type')}</th>
                  <th>{t('roles', 'Roles')}</th>
                  <th>{t('status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{u.matricola || '—'}</td>
                    <td><span className="badge badge-draft" style={{ background: 'var(--bg-surface)' }}>{t(u.staff_type, u.staff_type)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['STANDARD_USER', 'PROJECT_MANAGER', 'FINANCIAL_APPROVER', 'ADMIN_DEPARTMENT'].map(r => {
                          const has = u.roles.some(role => role.name === r)
                          return (
                            <button 
                              key={r}
                              onClick={() => handleRoleToggle(u.id, r, has)}
                              style={{
                                padding: '2px 8px', fontSize: '0.65rem', borderRadius: '10px',
                                border: '1px solid', fontWeight: 600, cursor: 'pointer',
                                background: has ? (r === 'ADMIN_DEPARTMENT' ? 'rgba(239,68,68,0.1)' : 'var(--primary-glow)') : 'transparent',
                                borderColor: has ? (r === 'ADMIN_DEPARTMENT' ? 'rgba(239,68,68,0.3)' : 'var(--primary)') : 'var(--border)',
                                color: has ? (r === 'ADMIN_DEPARTMENT' ? 'var(--danger)' : 'var(--primary-light)') : 'var(--text-muted)'
                              }}
                              title={t('click_to_assign_role', 'Click to assign role')}
                            >
                              {t(r, r.replace('_', ' '))}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${u.is_active ? 'active' : 'closed'}`}>
                        {u.is_active ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal 
          title={t('create_new_user', 'Create New User')} 
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('cancel', 'Cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreateUser} disabled={submitting}>
                {submitting ? <Spinner size={16} /> : t('create_user', 'Create User')}
              </button>
            </>
          }
        >
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('first_name', 'First Name')} <span>*</span></label>
              <input className="form-control" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('last_name', 'Last Name')} <span>*</span></label>
              <input className="form-control" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{t('email', 'Email')} <span>*</span></label>
              <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('temporary_password', 'Temporary Password')} <span>*</span></label>
              <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('matricola', 'Matricola')}</label>
              <input className="form-control" value={formData.matricola} onChange={e => setFormData({...formData, matricola: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{t('staff_type', 'Staff Type')} <span>*</span></label>
              <select className="form-control" value={formData.staff_type} onChange={e => setFormData({...formData, staff_type: e.target.value})}>
                <option value="professor_ordinario">{t('professor_ordinario', 'Full Professor')}</option>
                <option value="professor_associato">{t('professor_associato', 'Associate Professor')}</option>
                <option value="researcher">{t('researcher', 'Researcher')}</option>
                <option value="phd_student">{t('phd_student', 'PhD Student')}</option>
                <option value="post_doc">{t('post_doc', 'Research Fellow (Post-doc)')}</option>
                <option value="admin_tab">{t('admin_tab', 'TA Staff')}</option>
                <option value="contractor">{t('contractor', 'Contractor')}</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
