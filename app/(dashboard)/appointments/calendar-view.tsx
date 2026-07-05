'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Appointment } from '@/types/database'


const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-blue-400',
  completed: 'bg-emerald-400',
  cancelled: 'bg-zinc-500',
  no_show: 'bg-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

interface Props {
  appointments: Appointment[]
  onDayClick?: (date: Date) => void
}

export function CalendarView({ appointments, onDayClick }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(new Date())
  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad to start on Monday (0=Sun → offset)
  const startPad = (getDay(monthStart) + 6) % 7 // Mon=0
  const cells = [...Array(startPad).fill(null), ...days]

  // Group once by day key instead of filtering the full list per cell
  const aptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of appointments) {
      const key = format(new Date(a.starts_at), 'yyyy-MM-dd')
      const bucket = map.get(key)
      if (bucket) bucket.push(a)
      else map.set(key, [a])
    }
    return map
  }, [appointments])

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
        <TooltipProvider>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border last:border-r-0 bg-muted/10" />
              const dayApts = aptsByDay.get(format(day, 'yyyy-MM-dd')) ?? []
              const today = isToday(day)
              const inMonth = isSameMonth(day, current)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    onDayClick?.(day)
                    router.push(`?view=list&date=${format(day, 'yyyy-MM-dd')}`)
                  }}
                  className={`min-h-[80px] p-2 border-b border-r border-border last:border-r-0 transition-colors cursor-pointer hover:bg-muted/20 ${!inMonth ? 'opacity-30' : ''}`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${today ? 'bg-primary text-white' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>

                  {dayApts.length > 0 && (
                    <div className="space-y-0.5">
                      {dayApts.slice(0, 3).map(a => (
                        <Tooltip key={a.id}>
                          <TooltipTrigger
                            render={
                              <div className="flex items-center gap-1 min-w-0 rounded px-0.5 -mx-0.5 hover:bg-muted/40">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? 'bg-muted'}`} />
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {format(new Date(a.starts_at), 'HH:mm')}
                                  {a.customer?.name ? ` · ${a.customer.name}` : ''}
                                </span>
                              </div>
                            }
                          />
                          <TooltipContent side="top" className="pointer-events-none">
                            <div className="space-y-0.5">
                              <p className="font-semibold">
                                {format(new Date(a.starts_at), 'HH:mm')} – {a.customer?.name ?? 'Sin nombre'}
                              </p>
                              <p className="opacity-80">
                                {a.service?.name ?? '—'}{a.staff?.name ? ` · ${a.staff.name}` : ''}
                              </p>
                              <p className="opacity-60">{STATUS_LABEL[a.status] ?? a.status}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
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
        </TooltipProvider>
      </div>
    </div>
  )
}
