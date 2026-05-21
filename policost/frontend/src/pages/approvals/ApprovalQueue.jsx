import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { approvalsApi, expensesApi } from '../../api'
import { PageLoader, EmptyState, StatusBadge, formatCurrency, formatDate, Modal } from '../../components/ui'
import { CheckSquare, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'

export default function ApprovalQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, hasAnyRole } = useAuthStore()
  const { t } = useTranslation()
  const isAdmin = hasAnyRole('ADMIN_DEPARTMENT')
  const isFinancial = hasAnyRole('FINANCIAL_APPROVER')

  // Modal
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [approveAction, setApproveAction] = useState('approved')
  const [approveComment, setApproveComment] = useState('')

  const loadQueue = async () => {
    setLoading(true)
    try {
      const { data } = await approvalsApi.queue({ per_page: 50 })
      setQueue(data.data.items)
    } catch (err) {
      toast.error('Failed to load approval queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, [])

  const handleProcessApproval = async () => {
    try {
      const isPM = hasAnyRole('PROJECT_MANAGER') && selectedExpense.project?.manager_id === user?.id
      const isOverride = isAdmin && !isPM && !isFinancial
      
      await expensesApi.approve(selectedExpense.id, approveAction, approveComment, isOverride)
      toast.success(`Expense ${approveAction}`)
      setSelectedExpense(null)
      loadQueue()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process approval')
    }
  }

  const openModal = (expense, action) => {
    setSelectedExpense(expense)
    setApproveAction(action)
    setApproveComment('')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('actions') || 'Approval Queue'}</h1>
          <p>Review and act on pending expense requests</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <PageLoader />
        ) : queue.length === 0 ? (
          <EmptyState 
            icon={<CheckSquare size={48} />} 
            title="All caught up!" 
            description="There are no expenses waiting for your approval right now." 
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Submitter</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(exp => (
                  <tr key={exp.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Link to={`/expenses/${exp.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {exp.title}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {formatDate(exp.submitted_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{exp.submitter?.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{exp.submitter?.matricola || 'No Matr.'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{exp.project?.code}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                    <td><StatusBadge status={exp.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-success" onClick={() => openModal(exp, 'approved')} title="Approve">
                          <CheckCircle size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => openModal(exp, 'rejected')} title="Reject">
                          <XCircle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedExpense && (
        <Modal 
          title={t('process_approval')} 
          onClose={() => setSelectedExpense(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setSelectedExpense(null)}>{t('cancel')}</button>
              <button className={`btn btn-${approveAction === 'approved' ? 'success' : 'danger'}`} onClick={handleProcessApproval}>
                {approveAction === 'approved' ? t('confirm_approval') : t('confirm_rejection')}
              </button>
            </>
          }
        >
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600 }}>{selectedExpense.title}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('amount')}:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(selectedExpense.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Submitter:</span>
              <span>{selectedExpense.submitter?.full_name}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('actions')}</label>
            <select className="form-control" value={approveAction} onChange={e => setApproveAction(e.target.value)}>
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('comments_required')}</label>
            <textarea 
              className="form-control" 
              rows={4}
              value={approveComment}
              onChange={e => setApproveComment(e.target.value)}
            />
          </div>
          {isAdmin && !(hasAnyRole('PROJECT_MANAGER') && selectedExpense.project?.manager_id === user?.id) && !isFinancial && (
            <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
              <strong>{t('admin_override')}:</strong> {t('bypassing_workflow')}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
