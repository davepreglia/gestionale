import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../ui'

export default function BudgetDonut({ spent, remaining, height = 250 }) {
  const { t } = useTranslation()
  
  const data = [
    { name: t('spent'), value: spent, color: 'var(--primary)' },
    { name: t('remaining'), value: Math.max(remaining, 0), color: 'var(--border-light)' },
  ]

  // If overbudget
  if (remaining < 0) {
    data[0].color = 'var(--danger)'
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border)', 
          padding: '0.75rem', 
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: payload[0].payload.color === 'var(--border-light)' ? 'var(--text-primary)' : payload[0].payload.color, fontWeight: 700, fontSize: '0.9rem' }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  const total = spent + Math.max(remaining, 0)
  const percentage = total > 0 ? Math.round((spent / total) * 100) : 0

  return (
    <div style={{ width: '100%', height, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="68%"
            outerRadius="88%"
            paddingAngle={0}
            dataKey="value"
            stroke="var(--bg-card)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            animationDuration={850}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {t('spent')}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: remaining < 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: '2px', lineHeight: 1 }}>
          {percentage}%
        </div>
      </div>
    </div>
  )
}
