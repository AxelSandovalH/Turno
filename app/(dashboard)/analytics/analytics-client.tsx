'use client'

import { BarChart2, TrendingUp, TrendingDown, Users, CheckCircle2, XCircle, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KPIs {
  totalThisMonth: number
  completedThisMonth: number
  cancelRate: number
  growthPct: number | null
  estimatedRevenue: number
}

interface WeekData { label: string; total: number; completed: number }
interface ServiceData { name: string; count: number; price: number }
interface StaffData { name: string; count: number }
interface MonthData { label: string; count: number }

interface Props {
  kpis: KPIs
  weeks: WeekData[]
  topServices: ServiceData[]
  topStaff: StaffData[]
  newByMonth: MonthData[]
  monthLabel: string
}

// ── Bar chart (SVG) ───────────────────────────────────────────────────────────
function BarChart({ data, colorClass }: {
  data: { label: string; value: number; secondary?: number }[]
  colorClass: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const H = 80

  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: H + 28 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: H }}>
            {d.secondary !== undefined && d.secondary > 0 && (
              <div
                className="w-full rounded-t-sm bg-violet-500/25"
                style={{ height: `${(d.secondary / max) * H}px` }}
              />
            )}
            <div
              className={`w-full rounded-t-sm ${colorClass}`}
              style={{ height: `${Math.max(2, (d.value / max) * H)}px` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ name, count, max, color }: { name: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-foreground truncate max-w-[60%]">{name}</span>
        <span className="text-muted-foreground font-medium">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; accent: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className={`text-xs mt-0.5 ${accent}`}>{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${accent.includes('violet') ? 'bg-violet-500/10' : accent.includes('emerald') ? 'bg-emerald-500/10' : accent.includes('red') ? 'bg-red-500/10' : accent.includes('amber') ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AnalyticsClient({ kpis, weeks, topServices, topStaff, newByMonth, monthLabel }: Props) {
  const { totalThisMonth, completedThisMonth, cancelRate, growthPct, estimatedRevenue } = kpis

  const weekBars = weeks.map(w => ({ label: w.label, value: w.completed, secondary: w.total - w.completed }))
  const monthBars = newByMonth.map(m => ({ label: m.label, value: m.count }))

  const maxService = Math.max(...topServices.map(s => s.count), 1)
  const maxStaff   = Math.max(...topStaff.map(s => s.count), 1)

  const growthSub = growthPct !== null
    ? growthPct >= 0
      ? `↑ ${growthPct}% vs mes anterior`
      : `↓ ${Math.abs(growthPct)}% vs mes anterior`
    : 'Primer mes'
  const growthAccent = growthPct === null ? 'text-muted-foreground' : growthPct >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{monthLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Citas este mes"
          value={totalThisMonth}
          sub={growthSub}
          accent={growthAccent}
          icon={<BarChart2 className="h-4 w-4 text-blue-400" />}
        />
        <KpiCard
          label="Completadas"
          value={completedThisMonth}
          sub={totalThisMonth > 0 ? `${Math.round((completedThisMonth / totalThisMonth) * 100)}% del total` : undefined}
          accent="text-emerald-400"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        />
        <KpiCard
          label="Tasa de cancelación"
          value={`${cancelRate}%`}
          sub={cancelRate === 0 ? '¡Perfecto!' : cancelRate > 20 ? 'Alta — revisa recordatorios' : 'Normal'}
          accent={cancelRate > 20 ? 'text-red-400' : cancelRate > 10 ? 'text-amber-400' : 'text-emerald-400'}
          icon={<XCircle className="h-4 w-4 text-red-400" />}
        />
        <KpiCard
          label="Ingreso estimado"
          value={estimatedRevenue > 0 ? `$${estimatedRevenue.toLocaleString('es-MX')}` : '—'}
          sub={estimatedRevenue > 0 ? 'Basado en citas completadas' : 'Agrega precios a tus servicios'}
          accent="text-violet-400"
          icon={<DollarSign className="h-4 w-4 text-violet-400" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weekly citas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Citas por semana
              <span className="text-xs font-normal text-muted-foreground">(últimas 8 semanas)</span>
            </CardTitle>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" />Completadas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500/25 inline-block" />Otras</span>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart data={weekBars} colorClass="bg-violet-500" />
          </CardContent>
        </Card>

        {/* New customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Clientes nuevos
              <span className="text-xs font-normal text-muted-foreground">(últimos 6 meses)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={monthBars} colorClass="bg-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Rankings row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Servicios más solicitados</CardTitle>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardHeader>
          <CardContent>
            {topServices.every(s => s.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin citas este mes todavía</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground truncate max-w-[60%]">{s.name}</span>
                      <div className="flex items-center gap-2">
                        {s.price > 0 && <span className="text-xs text-muted-foreground">${s.price}</span>}
                        <span className="text-muted-foreground font-medium">{s.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${(s.count / maxService) * 100}%`, transition: 'width .4s ease' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top staff */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Staff más activo</CardTitle>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardHeader>
          <CardContent>
            {topStaff.every(s => s.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin citas este mes todavía</p>
            ) : (
              <div className="space-y-3">
                {topStaff.map((s, i) => (
                  <HBar key={i} name={s.name} count={s.count} max={maxStaff} color="bg-emerald-500" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
