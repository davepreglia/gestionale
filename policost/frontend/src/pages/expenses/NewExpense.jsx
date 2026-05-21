import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { expensesApi, projectsApi } from '../../api'
import { Spinner } from '../../components/ui'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

export default function NewExpense() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    project_id: '',
    category_id: '',
    external_reference: '',
    receipt_required: true
  })

  useEffect(() => {
    Promise.all([
      projectsApi.list({ status: 'active' }),
      projectsApi.categories()
    ]).then(([projRes, catRes]) => {
      setProjects(projRes.data.data.items)
      setCategories(catRes.data.data)
    }).catch(console.error)
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await expensesApi.create({
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: parseInt(formData.category_id)
      })
      toast.success(t('expense_draft_created', 'Expense draft created successfully'))
      navigate(`/expenses/${data.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || t('failed_create_expense', 'Failed to create expense'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>{t('new_expense', 'New Expense')}</h1>
          <p>{t('create_expense_draft_desc', 'Create a new expense request draft')}</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label">{t('title', 'Title')} <span>*</span></label>
            <input 
              type="text" 
              name="title"
              className="form-control" 
              placeholder={t('title_placeholder_travel', 'e.g. Travel to Rome for AI Conference')}
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('amount', 'Amount')} (€) <span>*</span></label>
              <input 
                type="number" 
                name="amount"
                step="0.01"
                min="0.01"
                className="form-control" 
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('expense_date', 'Expense Date')} <span>*</span></label>
              <input 
                type="date" 
                name="expense_date"
                className="form-control" 
                value={formData.expense_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('project', 'Project')} <span>*</span></label>
              <select 
                name="project_id"
                className="form-control" 
                value={formData.project_id}
                onChange={handleChange}
                required
              >
                <option value="">{t('select_project', '-- Select Project --')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('category', 'Category')} <span>*</span></label>
              <select 
                name="category_id"
                className="form-control" 
                value={formData.category_id}
                onChange={handleChange}
                required
              >
                <option value="">{t('select_category', '-- Select Category --')}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {t(`category_${c.code?.toLowerCase()}`, c.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('description', 'Description / Notes')}</label>
            <textarea 
              name="description"
              className="form-control" 
              placeholder={t('description_placeholder', 'Provide any additional context or justification...')}
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('external_reference', 'External Reference')}</label>
              <input 
                type="text" 
                name="external_reference"
                className="form-control" 
                placeholder={t('external_ref_placeholder', 'Invoice #, Order #, etc. (optional)')}
                value={formData.external_reference}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input 
                  type="checkbox" 
                  name="receipt_required"
                  checked={formData.receipt_required}
                  onChange={handleChange}
                />
                {t('requires_receipt_label', 'This expense requires a receipt/invoice document')}
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>{t('cancel', 'Cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner size={18} /> : t('save_as_draft', 'Save as Draft')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
