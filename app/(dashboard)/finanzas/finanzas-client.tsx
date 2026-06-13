'use client'

import { useState, useMemo } from 'react'
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, DollarSign, Calendar, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Period = 'day' | 'week' | 'month' | 'all'

interface Payment {
  id: string
  amount: number
  method: string
  status: string
  concept: string | null
  paid_at: string | null
  staff_id: string | null
  customer_id: string
}

interface Appointment {
  id: string
  staff_id: string
  status: string
  starts_at: string
}

interface StaffMember {
  id: string
  name: string
  commission_type: 'percentage' | 'fixed_per_session' | null
  commission_value: number | null
  role: string
}

interface Props {
  payments: Payment[]
  appointments: Appointment[]
  staff: StaffMember[]
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', insurance: 'Seguro', other: 'Otro',
}

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Hoy', week: 'Esta semana', month: 'Este mes', all: '90 días',
}

export function FinanzasClient({ payments, appointments, staff }: Props) {
  const [period, setPeriod] = useState<Period>('month')

  const periodStart = useMemo(() => {
    const now = new Date()
    if (period === 'day') return startOfDay(now)
    if (period === 'week') return startOfWeek(now, { weekStartsOn: 1 })
    if (period === 'month') return startOfMonth(now)
    return subDays(now, 90)
  }, [period])

  // Filter by period
  const filteredPayments = useMemo(() =>
    payments.filter(p => p.status === 'paid' && p.paid_at && isAfter(new Date(p.paid_at), periodStart)),
    [payments, periodStart]
  )

  const pendingPayments = useMemo(() =>
    payments.filter(p => p.status === 'pending'),
    [payments]
  )

  const filteredAppointments = useMemo(() =>
    appointments.filter(a => isAfter(new Date(a.starts_at), periodStart)),
    [appointments, periodStart]
  )

  // KPIs
  const totalRevenue = filteredPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = pendingPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalSessions = filteredAppointments.length

  // Revenue by day (last 30 for chart)
  const chartDays = 30
  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = subDays(new Date(), i)
      map.set(format(d, 'yyyy-MM-dd'), 0)
    }
    payments
      .filter(p => p.status === 'paid' && p.paid_at)
      .forEach(p => {
        const key = format(new Date(p.paid_at!), 'yyyy-MM-dd')
        if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(p.amount))
      })
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }))
  }, [payments])

  const maxChart = Math.max(...chartData.map(d => d.amount), 1)

  // Revenue by method
  const byMethod = useMemo(() => {
    const map: Record<string, number> = {}
    filteredPayments.forEach(p => {
      map[p.method] = (map[p.method] ?? 0) + Number(p.amount)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filteredPayments])

  // Commissions per staff
  const commissions = useMemo(() => {
    return staff
      .filter(s => s.commission_value && s.commission_value > 0)
      .map(s => {
        const revenue = filteredPayments
          .filter(p => p.staff_id === s.id)
          .reduce((acc, p) => acc + Number(p.amount), 0)
        const sessions = filteredAppointments
          .filter(a => a.staff_id === s.id).length

        const commission = s.commission_type === 'fixed_per_session'
          ? sessions * (s.commission_value ?? 0)
          : revenue * ((s.commission_value ?? 0) / 100)

        return { staff: s, revenue, sessions, commission }
      })
      .filter(c => c.sessions > 0 || c.revenue > 0)
  }, [staff, filteredPayments, filteredAppointments])

  const totalCommissions = commissions.reduce((s, c) => s + c.commission, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Finanzas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ingresos, sesiones y comisiones</p>
        </div>
        {/* Period selector */}
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 transition-colors ${period === p ? 'bg-violet-500 text-white font-medium' : 'text-muted-foreground hover:bg-muted/40'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
          label="Ingresos"
          value={`$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
          sub={PERIOD_LABELS[period]}
          accent="emerald"
        />
        <KpiCard
          icon={<Calendar className="h-4 w-4 text-violet-400" />}
          label="Sesiones"
          value={totalSessions.toString()}
          sub="completadas"
          accent="violet"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
          label="Por cobrar"
          value={`$${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
          sub="pendientes"
          accent="amber"
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-blue-400" />}
          label="Comisiones"
          value={`$${totalCommissions.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
          sub="por pagar"
          accent="blue"
        />
      </div>

      {/* Chart — 30 days */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Ingresos últimos 30 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} max={maxChart} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* By method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Método de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pagos en el período</p>
            ) : byMethod.map(([method, amount]) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
              return (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{METHOD_LABEL[method] ?? method}</span>
                    <span className="font-medium">${amount.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Comisiones por terapeuta</CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin comisiones configuradas o sin actividad en el período.{' '}
                <span className="text-violet-400">Configúralas en Equipo →</span>
              </p>
            ) : (
              <div className="space-y-3">
                {commissions.map(({ staff: s, revenue, sessions, commission }) => (
                  <div key={s.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sessions} sesiones · ${revenue.toLocaleString('es-MX')} generados
                          {s.commission_type === 'percentage'
                            ? ` · ${s.commission_value}%`
                            : ` · $${s.commission_value}/sesión`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-semibold">
                        ${commission.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold">
                  <span>Total a pagar</span>
                  <span>${totalCommissions.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pagos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos en el período seleccionado.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Concepto</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Método</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">Fecha</th>
                    <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.slice(0, 20).map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 text-foreground">{p.concept ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{METHOD_LABEL[p.method] ?? p.method}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                        {p.paid_at ? format(new Date(p.paid_at), 'd MMM yyyy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-emerald-400">
                        ${Number(p.amount).toLocaleString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const ICON_BG: Record<string, string> = {
  emerald: 'bg-emerald-500/10',
  violet:  'bg-violet-500/10',
  amber:   'bg-amber-500/10',
  blue:    'bg-blue-500/10',
}

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string
}) {
  const bg = ICON_BG[accent] ?? 'bg-violet-500/10'
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>
          </div>
          <div className={`p-2 rounded-lg ${bg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RevenueChart({ data, max }: { data: { date: string; amount: number }[]; max: number }) {
  const W = 560, H = 110
  const PAD = { top: 12, right: 8, bottom: 24, left: 40 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const n = data.length

  const xOf = (i: number) => PAD.left + (i / (n - 1)) * chartW
  const yOf = (v: number) => PAD.top + chartH - (max > 0 ? (v / max) * chartH : 0)

  // Polyline points
  const linePoints = data.map((d, i) => `${xOf(i)},${yOf(d.amount)}`).join(' ')

  // Closed area path: line + bottom-right + bottom-left
  const areaPath = [
    `M ${xOf(0)},${yOf(data[0].amount)}`,
    ...data.slice(1).map((d, i) => `L ${xOf(i + 1)},${yOf(d.amount)}`),
    `L ${xOf(n - 1)},${PAD.top + chartH}`,
    `L ${xOf(0)},${PAD.top + chartH}`,
    'Z',
  ].join(' ')

  // Y-axis labels (3 levels)
  const yTicks = [0, 0.5, 1].map(t => ({ v: max * t, y: yOf(max * t) }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis grid + labels */}
      {yTicks.map(({ v, y }) => (
        <g key={v}>
          <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y}
            stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />
          <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize={8}
            fill="currentColor" opacity={0.4}>
            {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : v > 0 ? `$${v.toFixed(0)}` : '$0'}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#revenue-grad)" />

      {/* Line */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots + X labels every 7 days */}
      {data.map((d, i) => {
        const x = xOf(i)
        const y = yOf(d.amount)
        const isToday = d.date === format(new Date(), 'yyyy-MM-dd')
        return (
          <g key={d.date}>
            {(d.amount > 0 || isToday) && (
              <circle
                cx={x} cy={y} r={isToday ? 3.5 : 2.5}
                fill={isToday ? '#a78bfa' : '#7c3aed'}
                stroke="var(--background)" strokeWidth={1.5}
              />
            )}
            {i % 7 === 0 && (
              <text x={x} y={H - 4} textAnchor="middle" fontSize={8}
                fill="currentColor" opacity={0.4}>
                {format(new Date(d.date + 'T12:00:00'), 'd/M')}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
