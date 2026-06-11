import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { startOfWeek, subWeeks, startOfMonth, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AnalyticsClient } from './analytics-client'

export default async function AnalyticsPage() {
  const { organization } = await requireOrganization()
  const db = createServiceClient()
  const orgId = organization.id
  const now = new Date()

  // Date ranges
  const thisMonthStart = startOfMonth(now).toISOString()
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
  const last8WeeksStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 7).toISOString()
  const last6MonthsStart = startOfMonth(subMonths(now, 5)).toISOString()

  const [
    { data: allAppointments },
    { data: thisMonthAppts },
    { data: lastMonthAppts },
    { data: staffList },
    { data: serviceList },
    { data: customers },
  ] = await Promise.all([
    db.from('appointments')
      .select('id, status, starts_at, ends_at, service_id, staff_id, created_at')
      .eq('organization_id', orgId)
      .gte('starts_at', last8WeeksStart)
      .order('starts_at', { ascending: true }),

    db.from('appointments')
      .select('id, status, service_id, staff_id')
      .eq('organization_id', orgId)
      .gte('starts_at', thisMonthStart),

    db.from('appointments')
      .select('id, status')
      .eq('organization_id', orgId)
      .gte('starts_at', lastMonthStart)
      .lt('starts_at', thisMonthStart),

    db.from('staff')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('is_active', true),

    db.from('services')
      .select('id, name, price, duration_minutes')
      .eq('organization_id', orgId)
      .eq('is_active', true),

    db.from('customers')
      .select('id, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', last6MonthsStart),
  ])

  const appts = allAppointments ?? []
  const thisMonth = thisMonthAppts ?? []
  const lastMonth = lastMonthAppts ?? []

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const completedThis = thisMonth.filter(a => a.status === 'completed').length
  const cancelledThis = thisMonth.filter(a => a.status === 'cancelled').length
  const cancelRate = thisMonth.length > 0 ? Math.round((cancelledThis / thisMonth.length) * 100) : 0
  const lastMonthTotal = lastMonth.length
  const growthPct = lastMonthTotal > 0
    ? Math.round(((thisMonth.length - lastMonthTotal) / lastMonthTotal) * 100)
    : null

  // ── Weekly bars (last 8 weeks) ────────────────────────────────────────────────
  const weeks: { label: string; total: number; completed: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i)
    const weekEnd   = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i - 1)
    const weekAppts = appts.filter(a => {
      const d = new Date(a.starts_at)
      return d >= weekStart && d < weekEnd
    })
    weeks.push({
      label: format(weekStart, 'd MMM', { locale: es }),
      total: weekAppts.length,
      completed: weekAppts.filter(a => a.status === 'completed').length,
    })
  }

  // ── Services ranking ──────────────────────────────────────────────────────────
  const serviceCounts: Record<string, number> = {}
  for (const a of thisMonth) {
    if (a.service_id) serviceCounts[a.service_id] = (serviceCounts[a.service_id] ?? 0) + 1
  }
  const topServices = (serviceList ?? [])
    .map(s => ({ name: s.name, count: serviceCounts[s.id] ?? 0, price: Number(s.price ?? 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Staff ranking ─────────────────────────────────────────────────────────────
  const staffCounts: Record<string, number> = {}
  for (const a of thisMonth) {
    if (a.staff_id) staffCounts[a.staff_id] = (staffCounts[a.staff_id] ?? 0) + 1
  }
  const topStaff = (staffList ?? [])
    .map(s => ({ name: s.name, count: staffCounts[s.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── New customers by month (last 6 months) ────────────────────────────────────
  const newByMonth: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const mStart = startOfMonth(subMonths(now, i))
    const mEnd   = startOfMonth(subMonths(now, i - 1))
    const count  = (customers ?? []).filter(c => {
      const d = new Date(c.created_at)
      return d >= mStart && d < mEnd
    }).length
    newByMonth.push({ label: format(mStart, 'MMM', { locale: es }), count })
  }

  // ── Estimated revenue (completed × avg service price) ────────────────────────
  const completedServiceIds = thisMonth
    .filter(a => a.status === 'completed' && a.service_id)
    .map(a => a.service_id!)
  const priceMap = Object.fromEntries((serviceList ?? []).map(s => [s.id, Number(s.price ?? 0)]))
  const estimatedRevenue = completedServiceIds.reduce((sum, id) => sum + (priceMap[id] ?? 0), 0)

  return (
    <AnalyticsClient
      kpis={{
        totalThisMonth: thisMonth.length,
        completedThisMonth: completedThis,
        cancelRate,
        growthPct,
        estimatedRevenue,
      }}
      weeks={weeks}
      topServices={topServices}
      topStaff={topStaff}
      newByMonth={newByMonth}
      monthLabel={format(now, 'MMMM yyyy', { locale: es })}
    />
  )
}
