import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '../ui'

export default function CategoryBar({ data = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No category data available
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>{label}</p>
          <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 700 }}>
            {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.count > 0 && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {payload[0].payload.count} expenses
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={val => `€${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`} />
          <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-surface)' }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="var(--accent)" fillOpacity={0.8 + (index * 0.05)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
