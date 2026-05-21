import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { expensesApi, documentsApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import { PageLoader, EmptyState, StatusBadge, formatCurrency, formatDate, FileDropzone, Spinner, Modal } from '../../components/ui'
import { ArrowLeft, Send, Trash2, FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export default function ExpenseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasAnyRole } = useAuthStore()
  const { t } = useTranslation()
  
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Approval Modal state
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approveAction, setApproveAction] = useState('approved')
  const [approveComment, setApproveComment] = useState('')

  const loadExpense = async () => {
    try {
      const { data } = await expensesApi.get(id)
      setExpense(data.data)
    } catch (err) {
      toast.error('Failed to load expense details')
      navigate('/expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadExpense() }, [id])

  if (loading) return <PageLoader />
  if (!expense) return <EmptyState title="Expense not found" />

  const isOwner = user?.id === expense.submitter_id
  const isDraft = expense.status === 'draft'
  const isPM = hasAnyRole('PROJECT_MANAGER') && expense.project?.manager_id === user?.id
  const isFinancial = hasAnyRole('FINANCIAL_APPROVER')
  const isAdmin = hasAnyRole('ADMIN_DEPARTMENT')
  
  const canSubmit = isOwner && isDraft
  const canDelete = (isOwner && isDraft) || isAdmin
  const canApprove = (isPM && ['submitted', 'under_review'].includes(expense.status)) || 
                     (isFinancial && expense.status === 'pm_approved') ||
                     (isAdmin && ['submitted', 'under_review', 'pm_approved'].includes(expense.status))

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    try {
      await expensesApi.delete(id)
      toast.success('Expense deleted')
      navigate('/expenses')
    } catch (err) {
      toast.error('Failed to delete expense')
    }
  }

  const handleSubmit = async () => {
    if (expense.receipt_required && (!expense.documents || expense.documents.length === 0)) {
      return toast.error('A receipt/invoice document is required before submission.')
    }
    setSubmitting(true)
    try {
      await expensesApi.submit(id)
      toast.success('Expense submitted for approval')
      loadExpense()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (file) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('expense_id', id)
    
    try {
      await documentsApi.upload(formData)
      toast.success('Document uploaded successfully')
      loadExpense()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (docId, filename) => {
    try {
      const res = await documentsApi.download(docId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      toast.error('Failed to download document')
    }
  }

  const handleProcessApproval = async () => {
    try {
      const isOverride = isAdmin && !isPM && !isFinancial;
      await expensesApi.approve(id, approveAction, approveComment, isOverride)
      toast.success(`Expense ${approveAction}`)
      setShowApproveModal(false)
      loadExpense()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process approval')
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {expense.title}
              <StatusBadge status={expense.status} />
            </h1>
            <p>Submitted by {expense.submitter?.full_name} on {formatDate(expense.created_at)}</p>
          </div>
        </div>
        <div className="page-header-actions">
          {canDelete && (
            <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> {t('delete')}</button>
          )}
          {canSubmit && (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size={16} /> : <><Send size={16} /> {t('submit_request')}</>}
            </button>
          )}
          {canApprove && (
            <button className="btn btn-success" onClick={() => setShowApproveModal(true)}>
              <CheckCircle size={16} /> {t('process_approval')}
            </button>
          )}
        </div>
      </div>

      {expense.is_duplicate_flagged && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>{t('potential_duplicate')}</strong> {t('duplicate_verify')}
          </div>
        </div>
      )}

      {expense.rejection_reason && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <strong>{t('rejected')}:</strong> {expense.rejection_reason}
        </div>
      )}

      <div className="grid grid-3" style={{ gap: '1.5rem', gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Details Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              {t('expense_details')}
            </h3>
            
            <div className="grid grid-2" style={{ gap: '1.5rem' }}>
              <div>
                <div className="form-label">{t('amount')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(expense.amount)}
                </div>
              </div>
              <div>
                <div className="form-label">{t('expense_date')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {formatDate(expense.expense_date)}
                </div>
              </div>
              <div>
                <div className="form-label">{t('project')}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {expense.project?.code} — {expense.project?.name}
                </div>
              </div>
              <div>
                <div className="form-label">{t('category')}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                  {t(`category_${expense.category?.code?.toLowerCase()}`, expense.category?.name)}
                </div>
              </div>
              {expense.external_reference && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label">{t('external_reference')}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 4 }}>
                    {expense.external_reference}
                  </div>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="form-label">{t('description')}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                  {expense.description || t('no_description')}
                </div>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('supporting_documents')}</h3>
              {expense.receipt_required && <span className="badge badge-warning">{t('receipt_required')}</span>}
            </div>

            {expense.documents?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {expense.documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ background: 'var(--primary-glow)', color: 'var(--primary-light)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.filename}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(doc.uploaded_at)} • {(doc.file_size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button className="btn btn-icon btn-ghost" onClick={() => handleDownload(doc.id, doc.filename)}>
                      <Download size={18} />
                    </button>
                  </div>
                ))}
                
                {(isDraft && isOwner) && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {uploading ? (
                      <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}><Spinner /></div>
                    ) : (
                      <FileDropzone onFile={handleFileUpload} />
                    )}
                  </div>
                )}
              </div>
            ) : (
              (isDraft && isOwner) ? (
                uploading ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)' }}><Spinner /></div>
                ) : (
                  <FileDropzone onFile={handleFileUpload} />
                )
              ) : (
                <EmptyState title={t('no_documents')} description={t('upload_instructions')} />
              )
            )}
          </div>
        </div>

        {/* Sidebar / Approval History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>{t('approval_workflow')}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)' }} />

              {/* Step 1: Submission */}
              <div style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <CheckCircle size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('submitted')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {expense.submitted_at ? formatDate(expense.submitted_at) : t('pending')}
                  </div>
                </div>
              </div>

              {/* Step 2: PM Review */}
              <div style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  background: expense.status === 'rejected' ? 'var(--danger)' : (['pm_approved', 'admin_approved', 'approved'].includes(expense.status) ? 'var(--success)' : 'var(--bg-surface)'),
                  border: ['pm_approved', 'admin_approved', 'approved', 'rejected'].includes(expense.status) ? 'none' : '2px solid var(--border)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 
                }}>
                  {['pm_approved', 'admin_approved', 'approved'].includes(expense.status) && <CheckCircle size={14} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('pm_review')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expense.project?.manager?.full_name}</div>
                </div>
              </div>

              {/* Step 3: Financial Review */}
              <div style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  background: expense.status === 'approved' ? 'var(--success)' : 'var(--bg-surface)',
                  border: expense.status === 'approved' ? 'none' : '2px solid var(--border)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 
                }}>
                  {expense.status === 'approved' && <CheckCircle size={14} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('financial_approval')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administration</div>
                </div>
              </div>
            </div>

            {expense.approvals?.length > 0 && (
              <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t('audit_log')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {expense.approvals.map(app => (
                    <div key={app.id} style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <strong style={{ color: app.action === 'approved' ? 'var(--success)' : 'var(--danger)' }}>
                          {t(app.action.toLowerCase())?.toUpperCase() || app.action.toUpperCase()}
                        </strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{formatDate(app.approved_at)}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>{t('by')} {app.approver?.full_name}</div>
                      {app.comment && <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>"{app.comment}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <Modal 
          title={t('process_approval')} 
          onClose={() => setShowApproveModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowApproveModal(false)}>{t('cancel')}</button>
              <button className={`btn btn-${approveAction === 'approved' ? 'success' : 'danger'}`} onClick={handleProcessApproval}>
                {approveAction === 'approved' ? t('confirm_approval') : t('confirm_rejection')}
              </button>
            </>
          }
        >
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
          {hasAnyRole('ADMIN_DEPARTMENT') && !isPM && !isFinancial && (
            <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
              <strong>{t('admin_override')}:</strong> {t('bypassing_workflow')}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
