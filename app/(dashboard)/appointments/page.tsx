import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Suspense } from 'react'
import { CheckCircle, Clock, XCircle, AlertTriangle, CircleCheck, Ban, UserX } from 'lucide-react'
import { AppointmentActions } from './appointment-actions'
import { NewAppointmentDialog } from './new-appointment-dialog'
import { CalendarView } from './calendar-view'
import { DayView } from './day-view'
import { PaymentSuccessToast } from './payment-success-toast'
import type { Appointment } from '@/types/database'

type ConfStatus = 'pending' | 'confirmed' | 'declined' | 'risk' | null

function resolveStatus(status: string, conf: ConfStatus): {
  label: string; className: string; Icon: React.ElementType
} {
  if (status === 'completed') return { label: 'Completada',       className: 'text-foreground',                    Icon: CircleCheck  }
  if (status === 'cancelled') return { label: 'Cancelada',        className: 'text-muted-foreground bg-muted',      Icon: Ban          }
  if (status === 'no_show')   return { label: 'No asistió',       className: 'text-destructive bg-destructive/10', Icon: UserX        }

  // status === 'confirmed' — diferencia por confirmation_status
  if (conf === 'confirmed') return { label: 'Asistencia confirmada', className: 'text-emerald-600 bg-emerald-500/10',  Icon: CheckCircle  }
  if (conf === 'declined')  return { label: 'Declinó asistencia',   className: 'text-destructive bg-destructive/10', Icon: XCircle      }
  if (conf === 'risk')      return { label: 'Riesgo de cancelación', className: 'text-amber-600 bg-amber-500/10',    Icon: AlertTriangle }
  return                           { label: 'Sin confirmar',         className: 'text-sky-600 bg-sky-500/10',        Icon: Clock        }
}

interface Props {
  searchParams: Promise<{ view?: string }>
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const { view = 'list' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  const today = new Date()
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">Citas</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5 capitalize">
            {format(today, "EEEE d 'de' MMMM", { locale: es })}
          </p>
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

          <div className="rounded-lg border border-border overflow-hidden">
            {list.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground">
                No hay citas programadas para hoy
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-card">
                    {['Hora', 'Paciente', 'Servicio', staffLabel, 'Estado', ''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(appointment => {
                    const { label, className, Icon } = resolveStatus(
                      appointment.status,
                      appointment.confirmation_status as ConfStatus,
                    )
                    return (
                      <tr key={appointment.id} className="border-b border-border last:border-0 hover:bg-card transition-colors">
                        <td className="px-4 py-3.5 font-mono text-[13px] text-muted-foreground">
                          {format(new Date(appointment.starts_at), 'HH:mm')}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] font-medium text-foreground">{appointment.customer?.name ?? 'Sin nombre'}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{appointment.customer?.phone}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-muted-foreground">{appointment.service?.name}</td>
                        <td className="px-4 py-3.5 text-[13px] text-muted-foreground">{appointment.staff?.name}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded ${className}`}>
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 w-10">
                          <AppointmentActions appointmentId={appointment.id} status={appointment.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
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
