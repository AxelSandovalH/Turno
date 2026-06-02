'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Appointment } from '@/types/database'

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-blue-400',
  completed: 'bg-emerald-400',
  cancelled: 'bg-zinc-500',
  no_show: 'bg-red-400',
}

interface Props {
  appointments: Appointment[]
  onDayClick?: (date: Date) => void
}

export function CalendarView({ appointments, onDayClick }: Props) {
  const [current, setCurrent] = useState(new Date())
  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad to start on Monday (0=Sun → offset)
  const startPad = (getDay(monthStart) + 6) % 7 // Mon=0
  const cells = [...Array(startPad).fill(null), ...days]

  function aptsForDay(day: Date) {
    return appointments.filter(a => isSameDay(new Date(a.starts_at), day))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium capitalize text-foreground">
          {format(current, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrent(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border last:border-r-0 bg-muted/10" />
            const dayApts = aptsForDay(day)
            const today = isToday(day)
            const inMonth = isSameMonth(day, current)

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick?.(day)}
                className={`min-h-[80px] p-2 border-b border-r border-border last:border-r-0 transition-colors cursor-pointer hover:bg-muted/20 ${!inMonth ? 'opacity-30' : ''}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${today ? 'bg-primary text-white' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>

                {dayApts.length > 0 && (
                  <div className="space-y-0.5">
                    {dayApts.slice(0, 3).map(a => (
                      <div key={a.id} className="flex items-center gap-1 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? 'bg-muted'}`} />
                        <span className="text-[10px] text-muted-foreground truncate">
                          {format(new Date(a.starts_at), 'HH:mm')}
                        </span>
                      </div>
                    ))}
                    {dayApts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{dayApts.length - 3} más</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
