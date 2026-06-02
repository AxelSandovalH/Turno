'use client'

import { useState } from 'react'
import { format, isSameDay, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Appointment } from '@/types/database'

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  completed: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  cancelled: 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400 line-through',
  no_show: 'bg-red-500/20 border-red-500/40 text-red-300',
}

const HOUR_HEIGHT = 64 // px per hour
const START_HOUR = 7
const END_HOUR = 22

interface Props {
  appointments: (Appointment & { customer?: { name: string | null }; staff?: { name: string }; service?: { name: string } })[]
  initialDate?: Date
}

export function DayView({ appointments, initialDate }: Props) {
  const [day, setDay] = useState(initialDate ?? new Date())

  const dayApts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  function topOffset(apt: Appointment) {
    const d = new Date(apt.starts_at)
    const mins = (d.getHours() - START_HOUR) * 60 + d.getMinutes()
    return Math.max(0, (mins / 60) * HOUR_HEIGHT)
  }

  function aptHeight(apt: Appointment) {
    const start = new Date(apt.starts_at)
    const end = new Date(apt.ends_at)
    const mins = (end.getTime() - start.getTime()) / 60000
    return Math.max(24, (mins / 60) * HOUR_HEIGHT)
  }

  return (
    <div className="space-y-4">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground capitalize">
          {format(day, "EEEE d 'de' MMMM", { locale: es })}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDay(d => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDay(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDay(d => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="relative" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
          {/* Hour lines */}
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <span className="text-[10px] text-muted-foreground w-12 text-right pr-2 pt-0.5 shrink-0">
                {String(h).padStart(2, '0')}:00
              </span>
              <div className="flex-1 border-t border-border h-full" />
            </div>
          ))}

          {/* Appointments */}
          <div className="absolute left-14 right-2 top-0">
            {dayApts.map(apt => (
              <div
                key={apt.id}
                className={`absolute left-0 right-0 rounded-lg border px-2 py-1 text-xs overflow-hidden ${STATUS_COLOR[apt.status] ?? ''}`}
                style={{
                  top: `${topOffset(apt)}px`,
                  height: `${aptHeight(apt)}px`,
                }}
              >
                <p className="font-medium truncate">{apt.customer?.name ?? 'Sin nombre'}</p>
                <p className="truncate opacity-75">{apt.service?.name} · {apt.staff?.name}</p>
                <p className="opacity-60">
                  {format(new Date(apt.starts_at), 'HH:mm')}–{format(new Date(apt.ends_at), 'HH:mm')}
                </p>
              </div>
            ))}

            {dayApts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin citas este día</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
