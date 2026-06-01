'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import type { StaffSchedule, TimeBlock } from '@/types/database'

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const DEFAULT_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
})

interface ScheduleManagerProps {
  staff: { id: string; name: string }[]
  schedules: StaffSchedule[]
  blocks: TimeBlock[]
  organizationId: string
}

export function ScheduleManager({ staff, schedules, blocks, organizationId }: ScheduleManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedStaff, setSelectedStaff] = useState(staff[0]?.id ?? '')
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockForm, setBlockForm] = useState({ staff_id: '', starts_at: '', ends_at: '', reason: '' })
  // Optimistic overrides: key = `${staffId}-${dayOfWeek}`
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})

  const staffSchedules = schedules.filter(s => s.staff_id === selectedStaff)

  function getSchedule(dayOfWeek: number): StaffSchedule | undefined {
    return staffSchedules.find(s => s.day_of_week === dayOfWeek)
  }

  function isWorking(dayOfWeek: number): boolean {
    const key = `${selectedStaff}-${dayOfWeek}`
    if (key in optimistic) return optimistic[key]
    return getSchedule(dayOfWeek)?.is_working ?? false
  }

  async function toggleDay(dayOfWeek: number, checked: boolean) {
    const key = `${selectedStaff}-${dayOfWeek}`
    // Optimistic update — instant visual feedback
    setOptimistic(prev => ({ ...prev, [key]: checked }))

    const existing = getSchedule(dayOfWeek)
    if (existing) {
      await supabase.from('staff_schedules').update({ is_working: checked }).eq('id', existing.id)
    } else {
      await supabase.from('staff_schedules').insert({
        staff_id: selectedStaff,
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '18:00',
        is_working: checked,
      })
    }

    // Remove optimistic override once server confirms
    setOptimistic(prev => { const n = { ...prev }; delete n[key]; return n })
    router.refresh()
  }

  async function updateTime(dayOfWeek: number, field: 'start_time' | 'end_time', value: string) {
    const existing = getSchedule(dayOfWeek)
    if (!existing) return

    await supabase.from('staff_schedules').update({ [field]: value }).eq('id', existing.id)
    router.refresh()
  }

  async function handleAddBlock() {
    if (!blockForm.starts_at || !blockForm.ends_at) return toast.error('Las fechas son requeridas')
    if (blockForm.starts_at >= blockForm.ends_at) return toast.error('La fecha de fin debe ser mayor')

    const { error } = await supabase.from('time_blocks').insert({
      organization_id: organizationId,
      staff_id: blockForm.staff_id || null,
      starts_at: blockForm.starts_at,
      ends_at: blockForm.ends_at,
      reason: blockForm.reason || null,
    })

    if (error) { toast.error(error.message); return }
    toast.success('Bloqueo agregado')
    setBlockOpen(false)
    setBlockForm({ staff_id: '', starts_at: '', ends_at: '', reason: '' })
    router.refresh()
  }

  async function deleteBlock(id: string) {
    await supabase.from('time_blocks').delete().eq('id', id)
    toast.success('Bloqueo eliminado')
    router.refresh()
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Primero agrega barberos en la sección de Barberos.
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="weekly">
      <TabsList>
        <TabsTrigger value="weekly">Horario semanal</TabsTrigger>
        <TabsTrigger value="blocks">Bloqueos</TabsTrigger>
      </TabsList>

      <TabsContent value="weekly" className="space-y-4 mt-4">
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Barbero</Label>
          <Select value={selectedStaff} onValueChange={v => setSelectedStaff(v ?? '')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {staff.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {DAYS.map(day => {
              const working = isWorking(day.value)

              return (
                <div key={day.value} className="flex items-center gap-4 px-4 py-3">
                  <ToggleSwitch
                    checked={working}
                    onCheckedChange={c => toggleDay(day.value, c)}
                  />
                  <span className={`w-24 text-sm font-medium ${!working ? 'text-muted-foreground' : ''}`}>
                    {day.label}
                  </span>
                  {working ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={schedule?.start_time?.slice(0, 5) ?? '09:00'}
                        onValueChange={v => v && updateTime(day.value, 'start_time', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_HOURS.map(h => (
                            <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">—</span>
                      <Select
                        value={schedule?.end_time?.slice(0, 5) ?? '18:00'}
                        onValueChange={v => v && updateTime(day.value, 'end_time', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_HOURS.map(h => (
                            <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No trabaja</span>
                  )}

                </div>
              )
            })}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="blocks" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={() => setBlockOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar bloqueo
          </Button>
        </div>

        {blocks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No hay bloqueos programados. Úsalos para vacaciones o días festivos.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {blocks.map(b => {
              const staffName = staff.find(s => s.id === b.staff_id)?.name
              return (
                <Card key={b.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {staffName ?? 'Todo el negocio'}
                        </Badge>
                        {b.reason && <p className="text-sm font-medium">{b.reason}</p>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(b.starts_at), "d MMM yyyy HH:mm", { locale: es })}
                        {' — '}
                        {format(new Date(b.ends_at), "d MMM yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteBlock(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </TabsContent>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar bloqueo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Aplica a</Label>
              <Select
                value={blockForm.staff_id}
                onValueChange={v => setBlockForm(p => ({ ...p, staff_id: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todo el negocio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todo el negocio</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input
                  type="datetime-local"
                  value={blockForm.starts_at}
                  onChange={e => setBlockForm(p => ({ ...p, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input
                  type="datetime-local"
                  value={blockForm.ends_at}
                  onChange={e => setBlockForm(p => ({ ...p, ends_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                placeholder="Vacaciones, día festivo..."
                value={blockForm.reason}
                onChange={e => setBlockForm(p => ({ ...p, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddBlock}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
