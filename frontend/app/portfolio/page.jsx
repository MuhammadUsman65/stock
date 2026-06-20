'use client'
import { useState } from 'react'
import useSWR from 'swr'
import {
  getHoldings, addHolding, deleteHolding, getPortfolioSummary,
} from '@/lib/api'
import { formatPrice, formatChange, changeColor } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Trash2, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const COLORS = ['#6366F1','#10B981','#F59E0B','#F43F5E','#06B6D4','#8B5CF6','#EC4899','#14B8A6']

function SummaryCard({ label, value, sub, positive }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: positive === undefined ? 'var(--text-primary)' : positive ? 'var(--positive)' : 'var(--negative)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  )
}

export default function PortfolioPage() {
  const [form, setForm] = useState({ ticker: '', quantity: '', purchase_price: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: holdings, mutate: mutateHoldings, isLoading } = useSWR(
    'holdings', getHoldings, { refreshInterval: 60_000 }
  )

  const { data: summary, mutate: mutateSummary } = useSWR(
    'portfolio-summary', getPortfolioSummary, { refreshInterval: 60_000 }
  )

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      await addHolding({
        ticker: form.ticker.toUpperCase(),
        quantity: parseFloat(form.quantity),
        purchase_price: parseFloat(form.purchase_price),
      })
      setForm({ ticker: '', quantity: '', purchase_price: '' })
      setShowForm(false)
      mutateHoldings()
      mutateSummary()
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteHolding(id)
      mutateHoldings()
      mutateSummary()
    } catch (_) {}
  }

  const pl = summary?.total_pl ?? null
  const plPct = summary?.total_pl_percent ?? null
  const pieData = (summary?.allocation || []).filter(a => a.value > 0)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            Portfolio
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {summary?.total_value != null ? `$${formatPrice(summary.total_value)}` : '—'}
          </div>
          {pl !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              {pl >= 0
                ? <TrendingUp size={14} color="var(--positive)" />
                : <TrendingDown size={14} color="var(--negative)" />
              }
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: changeColor(pl) }}>
                {pl >= 0 ? '+' : ''}${formatPrice(Math.abs(pl))} ({formatChange(plPct, true)}) total return
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: showForm ? 'var(--border)' : 'var(--accent)',
            color: showForm ? 'var(--text-secondary)' : '#FFFFFF',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <Plus size={15} />
          Add holding
        </button>
      </div>

      {/* Add holding form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { key: 'ticker', label: 'Ticker', placeholder: 'AAPL', width: 100 },
              { key: 'quantity', label: 'Shares', placeholder: '10', type: 'number', width: 100 },
              { key: 'purchase_price', label: 'Buy price ($)', placeholder: '150.00', type: 'number', width: 130 },
            ].map(({ key, label, placeholder, type = 'text', width }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  step={type === 'number' ? '0.01' : undefined}
                  required
                  style={{
                    width, padding: '8px 12px', borderRadius: 7,
                    border: '1px solid var(--border)', outline: 'none',
                    fontFamily: 'var(--font-mono)', fontSize: 13,
                    background: 'var(--bg)', color: 'var(--text-primary)',
                  }}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={adding}
              style={{
                padding: '8px 20px', borderRadius: 7, border: 'none',
                background: 'var(--accent)', color: '#FFFFFF',
                fontSize: 13, fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer',
                opacity: adding ? 0.7 : 1,
              }}
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
            {error && <span style={{ fontSize: 12, color: 'var(--negative)', alignSelf: 'center' }}>{error}</span>}
          </form>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          <SummaryCard label="Total invested" value={`$${formatPrice(summary.total_cost)}`} />
          <SummaryCard label="Market value" value={`$${formatPrice(summary.total_value)}`} />
          <SummaryCard
            label="Unrealized P&L"
            value={`${pl >= 0 ? '+' : ''}$${formatPrice(Math.abs(pl))}`}
            sub={formatChange(plPct, true)}
            positive={pl >= 0}
          />
          <SummaryCard label="Holdings" value={holdings?.length ?? '—'} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: pieData.length ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Holdings table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
            Holdings
          </div>

          {isLoading ? (
            <div className="state-box" style={{ height: 180 }}>Loading holdings...</div>
          ) : !holdings?.length ? (
            <div className="state-box" style={{ height: 180, flexDirection: 'column', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>No holdings yet.</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add your first position above.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Ticker', 'Shares', 'Buy price', 'Current', 'Market value', 'P&L', ''].map(h => (
                      <th key={h} style={{
                        padding: '8px 16px', textAlign: 'left', fontSize: 10.5,
                        fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: 'var(--text-muted)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => {
                    const pl = h.unrealized_pl
                    const plPct = h.unrealized_pl_percent
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg)' : 'transparent' }}>
                        <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                          {h.ticker}
                        </td>
                        <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {h.quantity}
                        </td>
                        <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                          ${formatPrice(h.purchase_price)}
                        </td>
                        <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {h.current_price != null ? `$${formatPrice(h.current_price)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                          {h.market_value != null ? `$${formatPrice(h.market_value)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: pl != null ? changeColor(pl) : 'var(--text-muted)' }}>
                          {pl != null ? (
                            <>
                              {pl >= 0 ? '+' : ''}${formatPrice(Math.abs(pl))}
                              <span style={{ fontSize: 10.5, marginLeft: 5, opacity: 0.8 }}>({formatChange(plPct, true)})</span>
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <button
                            onClick={() => handleDelete(h.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 5, display: 'flex', alignItems: 'center' }}
                            title="Remove holding"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Allocation pie */}
        {pieData.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
              Allocation
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="ticker"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={2} strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#FFFFFF' }}
                  formatter={(v, name) => [`$${formatPrice(v)}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {pieData.map((item, i) => (
                <div key={item.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{item.ticker}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {item.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}