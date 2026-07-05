import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Suspense } from 'react'
import { AppointmentsList } from './appointment-list'
import { NewAppointmentDialog } from './new-appointment-dialog'
import { CalendarView } from './calendar-view'
import { DayView } from './day-view'
import { PaymentSuccessToast } from './payment-success-toast'
import { SetupChecklist } from '@/components/dashboard/setup-checklist'
import type { Appointment } from '@/types/database'

interface Props {
  searchParams: Promise<{ view?: string; date?: string }>
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const { view = 'list', date } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  // Si viene ?date=YYYY-MM-DD desde el calendario, mostrar ese día; si no, hoy
  const today = date ? new Date(`${date}T12:00:00`) : new Date()
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999)

  // For calendar/day views — fetch whole month
  const monthStart = startOfMonth(today).toISOString()
  const monthEnd   = endOfMonth(today).toISOString()

  const [
    { data: todayApts },
    { data: monthApts },
    { data: staff },
    { data: services },
    { data: customers },
    { data: org },
  ] = await Promise.all([
    service
      .from('appointments')
      .select('*, customer:customers(name,phone), staff:staff(name), service:services(name,duration_minutes,price), confirmation_status')
      .eq('organization_id', organizationId)
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString())
      .order('starts_at'),
    service
      .from('appointments')
      .select('*, customer:customers(name,phone), staff:staff(name), service:services(name,duration_minutes,price), confirmation_status')
      .eq('organization_id', organizationId)
      .gte('starts_at', monthStart)
      .lte('starts_at', monthEnd)
      .order('starts_at'),
    service.from('staff').select('id, name').eq('organization_id', organizationId).eq('is_active', true),
    service.from('services').select('id, name, duration_minutes, price').eq('organization_id', organizationId).eq('is_active', true),
    service.from('customers').select('id, name, phone').eq('organization_id', organizationId).order('name'),
    service.from('organizations').select('business_type').eq('id', organizationId).single(),
  ])

  // Setup checklist state (derived from real data, hides itself when complete)
  const staffIds = (staff ?? []).map(s => s.id)
  const [{ data: anySchedule }, { data: anyConversation }] = await Promise.all([
    staffIds.length > 0
      ? service.from('staff_schedules').select('id').in('staff_id', staffIds).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    service.from('conversations').select('id').eq('organization_id', organizationId).limit(1).maybeSingle(),
  ])

  const staffLabel = org?.business_type === 'barbershop' ? 'Barbero' : 'Fisioterapeuta'

  const list = (todayApts ?? []) as Appointment[]
  const allApts = (monthApts ?? []) as Appointment[]

  const cntConfirmed  = list.filter(a => a.status === 'confirmed' && a.confirmation_status === 'confirmed').length
  const cntPending    = list.filter(a => a.status === 'confirmed' && (a.confirmation_status === 'pending' || a.confirmation_status === 'risk')).length
  const cntCompleted  = list.filter(a => a.status === 'completed').length
  const cntCancelled  = list.filter(a => a.status === 'cancelled' || (a.status === 'confirmed' && a.confirmation_status === 'declined')).length

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <PaymentSuccessToast />
      </Suspense>

      <SetupChecklist
        hasServices={(services ?? []).length > 0}
        hasSchedules={!!anySchedule}
        hasConversations={!!anyConversation}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">Citas</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[13px] text-muted-foreground capitalize">
              {format(today, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
            {date && (
              <a
                href="?view=list"
                className="text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                Hoy
              </a>
            )}
          </div>
        </div>
        <NewAppointmentDialog
          organizationId={organizationId}
          staff={staff ?? []}
          services={(services ?? []) as { id: string; name: string; duration_minutes: number; price: number | null }[]}
          customers={customers ?? []}
        />
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'list',     label: 'Lista' },
          { key: 'day',      label: 'Por hora' },
          { key: 'calendar', label: 'Calendario' },
        ].map(v => (
          <a
            key={v.key}
            href={`?view=${v.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === v.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.label}
          </a>
        ))}
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Confirmadas',   value: cntConfirmed, color: 'text-emerald-500' },
              { label: 'Sin confirmar', value: cntPending,   color: 'text-sky-500'     },
              { label: 'Completadas',   value: cntCompleted, color: 'text-foreground'  },
              { label: 'Canceladas',    value: cntCancelled, color: 'text-destructive' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-5 py-4">
                <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-2">{s.label}</p>
                <p className={`text-[28px] font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <AppointmentsList list={list} staffLabel={staffLabel} />
        </>
      )}

      {/* ── DAY VIEW ── */}
      {view === 'day' && (
        <DayView appointments={allApts as Parameters<typeof DayView>[0]['appointments']} />
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <CalendarView appointments={allApts} />
      )}
    </div>
  )
}
