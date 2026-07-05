'use client'

import { useState } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CheckCircle, Clock, XCircle, AlertTriangle, CircleCheck, Ban, UserX,
  Phone, Stethoscope, User, CalendarClock, X,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AppointmentActions } from './appointment-actions'
import type { Appointment } from '@/types/database'

type ConfStatus = 'pending' | 'confirmed' | 'declined' | 'risk' | null

function resolveStatus(status: string, conf: ConfStatus): {
  label: string; className: string; Icon: React.ElementType
} {
  if (status === 'completed') return { label: 'Completada',            className: 'text-foreground',                    Icon: CircleCheck  }
  if (status === 'cancelled') return { label: 'Cancelada',             className: 'text-muted-foreground bg-muted',      Icon: Ban          }
  if (status === 'no_show')   return { label: 'No asistió',            className: 'text-destructive bg-destructive/10', Icon: UserX        }
  if (conf === 'confirmed')   return { label: 'Asistencia confirmada', className: 'text-emerald-600 bg-emerald-500/10', Icon: CheckCircle  }
  if (conf === 'declined')    return { label: 'Declinó asistencia',    className: 'text-destructive bg-destructive/10', Icon: XCircle      }
  if (conf === 'risk')        return { label: 'Riesgo de cancelación', className: 'text-amber-600 bg-amber-500/10',     Icon: AlertTriangle }
  return                             { label: 'Sin confirmar',          className: 'text-sky-600 bg-sky-500/10',         Icon: Clock        }
}

interface Props {
  list: Appointment[]
  staffLabel: string
}

export function AppointmentsList({ list, staffLabel }: Props) {
  const [selected, setSelected] = useState<Appointment | null>(null)

  return (
    <>
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
                  <tr
                    key={appointment.id}
                    onClick={() => setSelected(appointment)}
                    className="border-b border-border last:border-0 hover:bg-card transition-colors cursor-pointer"
                  >
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
                    <td className="px-4 py-3.5 w-10" onClick={e => e.stopPropagation()}>
                      <AppointmentActions appointmentId={appointment.id} status={appointment.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <AppointmentDetailModal
        appointment={selected}
        onClose={() => setSelected(null)}
        staffLabel={staffLabel}
      />
    </>
  )
}

function AppointmentDetailModal({
  appointment: apt,
  onClose,
  staffLabel,
}: {
  appointment: Appointment | null
  onClose: () => void
  staffLabel: string
}) {
  if (!apt) return null

  const { label, className, Icon } = resolveStatus(
    apt.status,
    apt.confirmation_status as ConfStatus,
  )

  const startDate  = new Date(apt.starts_at)
  const endDate    = new Date(apt.ends_at)
  const duration   = differenceInMinutes(endDate, startDate)
  const price      = (apt.service as any)?.price

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground capitalize mb-0.5">
              {format(startDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
            <p className="text-xl font-semibold text-foreground font-mono">
              {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{duration} min</p>
          </div>
          {/* mr-8 keeps the badge clear of the dialog's close button */}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded mt-1 mr-8 ${className}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </span>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Patient */}
          <Row icon={<User className="h-4 w-4" />} label="Paciente">
            <p className="font-medium text-foreground">{apt.customer?.name ?? '—'}</p>
            {apt.customer?.phone && (
              <a
                href={`tel:${apt.customer.phone}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5"
                onClick={e => e.stopPropagation()}
              >
                <Phone className="h-3 w-3" />
                {apt.customer.phone}
              </a>
            )}
          </Row>

          {/* Service */}
          <Row icon={<Stethoscope className="h-4 w-4" />} label="Servicio">
            <p className="font-medium text-foreground">{apt.service?.name ?? '—'}</p>
            {price != null && price > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ${Number(price).toLocaleString('es-MX')}
              </p>
            )}
          </Row>

          {/* Staff */}
          <Row icon={<CalendarClock className="h-4 w-4" />} label={staffLabel}>
            <p className="font-medium text-foreground">{apt.staff?.name ?? '—'}</p>
          </Row>

          {/* Notes */}
          {apt.notes && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {apt.notes}
            </div>
          )}
        </div>

        {/* Footer — quick actions */}
        {apt.status !== 'completed' && apt.status !== 'cancelled' && (
          <div className="px-5 pb-5 pt-1 border-t border-border mt-1">
            <div className="pt-4">
              <AppointmentActions appointmentId={apt.id} status={apt.status} variant="buttons" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground/60 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
