import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi, expensesApi } from '../api'
import { StatCard, PageLoader, EmptyState, StatusBadge, formatCurrency, formatDate } from '../components/ui'
import ExpenseTimeline from '../components/charts/ExpenseTimeline'
import { Receipt, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardRes, timelineRes] = await Promise.all([
          analyticsApi.myDashboard(),
          analyticsApi.timeline(new Date().getFullYear())
        ])
        setData(dashboardRes.data.data)
        setTimeline(timelineRes.data.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <PageLoader />
  if (!data) return <EmptyState title={t('error_loading_dashboard')} />

  const { status_summary, total_submitted_amount, total_approved_amount, recent_expenses } = data

  const pendingCount = (status_summary.submitted || 0) + (status_summary.under_review || 0) + (status_summary.pm_approved || 0)

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      {/* Overview Cards */}
      <div className="grid grid-4">
        <StatCard
          icon={<Receipt size={24} />}
          label={t('total_submitted')}
          value={formatCurrency(total_submitted_amount)}
          variant="info"
        />
        <StatCard
          icon={<CheckCircle size={24} />}
          label={t('approved_amount')}
          value={formatCurrency(total_approved_amount)}
          variant="success"
        />
        <StatCard
          icon={<Clock size={24} />}
          label={t('pending_approvals')}
          value={pendingCount}
          variant="warning"
        />
        <StatCard
          icon={<XCircle size={24} />}
          label={t('rejected')}
          value={status_summary.rejected || 0}
          variant="danger"
        />
      </div>

      <div className="grid grid-3" style={{ gap: '1.5rem', gridTemplateColumns: '2fr 1fr' }}>
        {/* Main Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('my_expenses_activity')}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('current_year')} ({new Date().getFullYear()})</p>
            </div>
          </div>
          <ExpenseTimeline data={timeline} height={280} />
        </div>

        {/* Recent Activity List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('recent_activity')}</h3>
            <Link to="/expenses" className="btn btn-ghost btn-sm">{t('view_all')}</Link>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
            {recent_expenses.length === 0 ? (
              <EmptyState title={t('no_recent_expenses')} />
            ) : (
              recent_expenses.map(expense => (
                <div key={expense.id} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Link to={`/expenses/${expense.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{expense.title}</Link>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatDate(expense.expense_date)} • {expense.project?.code}
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
    </div>
  )
}
