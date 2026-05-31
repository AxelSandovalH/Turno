import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AppointmentActions } from './appointment-actions'
import type { Appointment } from '@/types/database'

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmada', className: 'text-[#7c3aed] bg-[#7c3aed]/10' },
  completed: { label: 'Completada', className: 'text-[#3d3d3d] bg-[#161616]' },
  cancelled: { label: 'Cancelada', className: 'text-[#dc2626] bg-[#dc2626]/10' },
  no_show: { label: 'No asistió', className: 'text-[#6b6b6b] bg-[#161616]' },
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const organizationId = user.user_metadata?.organization_id

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const { data: appointments } = await service
    .from('appointments')
    .select(`
      *,
      customer:customers(name, phone),
      staff:staff(name),
      service:services(name, duration_minutes, price)
    `)
    .eq('organization_id', organizationId)
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay)
    .order('starts_at', { ascending: true })

  const list = (appointments ?? []) as Appointment[]
  const confirmed = list.filter(a => a.status === 'confirmed').length
  const completed = list.filter(a => a.status === 'completed').length
  const cancelled = list.filter(a => a.status === 'cancelled').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[#ebebeb] tracking-tight">Citas de hoy</h1>
        <p className="text-[13px] text-[#6b6b6b] mt-0.5 capitalize">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Confirmadas', value: confirmed },
          { label: 'Completadas', value: completed },
          { label: 'Canceladas', value: cancelled },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-5 py-4">
            <p className="text-[11px] font-medium text-[#3d3d3d] uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-[28px] font-semibold text-[#ebebeb]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#1f1f1f] overflow-hidden">
        {list.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#3d3d3d]">
            No hay citas programadas para hoy
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#111111]">
                {['Hora', 'Cliente', 'Servicio', 'Barbero', 'Estado', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-medium text-[#3d3d3d] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(appointment => {
                const status = statusConfig[appointment.status] ?? statusConfig.confirmed
                return (
                  <tr key={appointment.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#111111] transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[13px] text-[#6b6b6b]">
                      {format(new Date(appointment.starts_at), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-[#ebebeb]">{appointment.customer?.name ?? 'Sin nombre'}</p>
                      <p className="text-[11px] text-[#3d3d3d] mt-0.5">{appointment.customer?.phone}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6b6b6b]">{appointment.service?.name}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#6b6b6b]">{appointment.staff?.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded ${status.className}`}>
                        {status.label}
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
    </div>
  )
}
