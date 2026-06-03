'use client'

import { useState } from 'react'
import { format, isSameDay, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Appointment } from '@/types/database'

const STATUS: Record<string, { bar: string; bg: string; text: string; sub: string; time: string }> = {
  confirmed: {
    bar:  'bg-blue-500',
    bg:   'bg-blue-500/10 border-blue-500/25 hover:bg-blue-500/15',
    text: 'text-blue-100',
    sub:  'text-blue-300/80',
    time: 'text-blue-400',
  },
  completed: {
    bar:  'bg-emerald-500',
    bg:   'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15',
    text: 'text-emerald-100',
    sub:  'text-emerald-300/80',
    time: 'text-emerald-400',
  },
  cancelled: {
    bar:  'bg-zinc-500',
    bg:   'bg-zinc-500/10 border-zinc-500/20 hover:bg-zinc-500/15',
    text: 'text-zinc-400 line-through',
    sub:  'text-zinc-500',
    time: 'text-zinc-500',
  },
  no_show: {
    bar:  'bg-red-500',
    bg:   'bg-red-500/10 border-red-500/25 hover:bg-red-500/15',
    text: 'text-red-200',
    sub:  'text-red-400/80',
    time: 'text-red-400',
  },
}

const HOUR_HEIGHT = 72
const START_HOUR  = 7
const END_HOUR    = 22

type Apt = Omit<Appointment, 'customer' | 'staff' | 'service'> & {
  customer?: { name: string | null }
  staff?:    { name: string }
  service?:  { name: string }
}

interface Props {
  appointments: Apt[]
  initialDate?: Date
}

export function DayView({ appointments, initialDate }: Props) {
  const [day, setDay] = useState(initialDate ?? new Date())

  const dayApts = appointments
    .filter(a => isSameDay(new Date(a.starts_at), day))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  function topOffset(apt: Apt) {
    const d = new Date(apt.starts_at)
    const mins = (d.getHours() - START_HOUR) * 60 + d.getMinutes()
    return Math.max(0, (mins / 60) * HOUR_HEIGHT)
  }

  function aptHeight(apt: Apt) {
    const mins = (new Date(apt.ends_at).getTime() - new Date(apt.starts_at).getTime()) / 60000
    return Math.max(36, (mins / 60) * HOUR_HEIGHT)
  }

  const s = (apt: Apt) => STATUS[apt.status] ?? STATUS.confirmed

  return (
    <div className="space-y-4">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground capitalize text-base">
          {format(day, "EEEE d 'de' MMMM", { locale: es })}
        </h3>
        <div className="flex gap-1 items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDay(d => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={() => setDay(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDay(d => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="relative" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>

          {/* Hour grid */}
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0"
              style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <div className="flex items-start h-full">
                <span className="text-[10px] text-muted-foreground/60 w-14 text-right pr-3 pt-1 shrink-0 select-none">
                  {String(h).padStart(2, '0')}:00
                </span>
                <div className="flex-1 border-t border-border/50" />
              </div>
            </div>
          ))}

          {/* Appointments */}
          <div className="absolute top-0 bottom-0" style={{ left: '56px', right: '12px' }}>
            {dayApts.map(apt => {
              const st     = s(apt)
              const height = aptHeight(apt)
              const compact = height < 56

              return (
                <div
                  key={apt.id}
                  className={`absolute left-0 right-0 rounded-lg border transition-colors cursor-default overflow-hidden flex gap-0 ${st.bg}`}
                  style={{ top: `${topOffset(apt)}px`, height: `${height}px` }}
                >
                  {/* Color bar */}
                  <div className={`w-1 shrink-0 rounded-l-lg ${st.bar}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0 px-2.5 py-1.5 flex flex-col justify-center gap-0.5">
                    {compact ? (
                      // Very short slot — single line
                      <p className={`text-[11px] font-semibold truncate ${st.text}`}>
                        {apt.customer?.name ?? 'Sin nombre'}
                        <span className={`font-normal ml-1.5 ${st.sub}`}>
                          · {apt.service?.name}
                        </span>
                      </p>
                    ) : (
                      <>
                        {/* Name */}
                        <p className={`text-[13px] font-semibold truncate leading-tight ${st.text}`}>
                          {apt.customer?.name ?? 'Sin nombre'}
                        </p>
                        {/* Service · Staff */}
                        <p className={`text-[11px] truncate leading-tight ${st.sub}`}>
                          {apt.service?.name}
                          {apt.staff?.name && <span> · {apt.staff.name}</span>}
                        </p>
                        {/* Time */}
                        <p className={`text-[10px] font-medium mt-0.5 ${st.time}`}>
                          {format(new Date(apt.starts_at), 'HH:mm')} – {format(new Date(apt.ends_at), 'HH:mm')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

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
