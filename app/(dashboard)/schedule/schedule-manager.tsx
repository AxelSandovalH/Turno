'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
})

interface Props {
  staff: { id: string; name: string }[]
  schedules: StaffSchedule[]
  blocks: TimeBlock[]
  organizationId: string
  staffLabel: string
}

export function ScheduleManager({ staff, schedules, blocks, organizationId, staffLabel }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Edit panel ──────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<string | null>(null)  // staff id being edited
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})

  // ── Block dialog ────────────────────────────────────────────────────────────
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockForm, setBlockForm] = useState({ staff_id: '', starts_at: '', ends_at: '', reason: '' })

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getSchedule(staffId: string, day: number) {
    return schedules.find(s => s.staff_id === staffId && s.day_of_week === day)
  }

  function isWorking(staffId: string, day: number) {
    const key = `${staffId}-${day}`
    if (key in optimistic) return optimistic[key]
    return getSchedule(staffId, day)?.is_working ?? false
  }

  function formatHours(staffId: string, day: number) {
    const s = getSchedule(staffId, day)
    if (!s?.is_working) return null
    return `${s.start_time?.slice(0, 5)} – ${s.end_time?.slice(0, 5)}`
  }

  // ── Toggle day ───────────────────────────────────────────────────────────────
  async function toggleDay(staffId: string, day: number, checked: boolean) {
    const key = `${staffId}-${day}`
    setOptimistic(prev => ({ ...prev, [key]: checked }))
    const existing = getSchedule(staffId, day)
    if (existing) {
      await supabase.from('staff_schedules').update({ is_working: checked }).eq('id', existing.id)
    } else {
      await supabase.from('staff_schedules').insert({
        staff_id: staffId,
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
        is_working: checked,
        organization_id: organizationId,
      })
    }
    router.refresh()
  }

  // ── Update time ──────────────────────────────────────────────────────────────
  async function updateTime(staffId: string, day: number, field: 'start_time' | 'end_time', value: string) {
    const existing = getSchedule(staffId, day)
    if (!existing) return
    await supabase.from('staff_schedules').update({ [field]: value }).eq('id', existing.id)
    router.refresh()
  }

  // ── Blocks ───────────────────────────────────────────────────────────────────
  async function handleAddBlock() {
    if (!blockForm.starts_at || !blockForm.ends_at) return toast.error('Las fechas son requeridas')
    if (blockForm.starts_at >= blockForm.ends_at) return toast.error('La fecha fin debe ser mayor')
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
          Primero agrega {staffLabel.toLowerCase()} en la sección de {staffLabel}.
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Vista general</TabsTrigger>
        <TabsTrigger value="blocks">Bloqueos</TabsTrigger>
      </TabsList>

      {/* ── Vista general ─────────────────────────────────────────────────────── */}
      <TabsContent value="overview" className="mt-4 space-y-4">

        {/* Grid: días × trabajadores */}
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-16">Día</th>
                {staff.map(s => (
                  <th key={s.id} className="px-3 py-3 text-xs font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-foreground">{s.name}</span>
                      <button
                        onClick={() => setEditing(editing === s.id ? null : s.id)}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                          editing === s.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        {editing === s.id ? <><Check className="h-2.5 w-2.5" />Listo</> : <><Pencil className="h-2.5 w-2.5" />Editar</>}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DAYS.map(day => (
                <tr key={day.value} className="hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium text-sm text-foreground">{day.label}</td>
                  {staff.map(s => {
                    const working = isWorking(s.id, day.value)
                    const hours   = formatHours(s.id, day.value)
                    const sched   = getSchedule(s.id, day.value)
                    const isEdit  = editing === s.id

                    return (
                      <td key={s.id} className="px-3 py-2 text-center">
                        {isEdit ? (
                          // ── Edit mode ──────────────────────────────────────
                          <div className="flex flex-col items-center gap-2">
                            <ToggleSwitch
                              checked={working}
                              onCheckedChange={c => toggleDay(s.id, day.value, c)}
                            />
                            {working && (
                              <div className="flex flex-col gap-1">
                                <Select
                                  value={sched?.start_time?.slice(0, 5) ?? '09:00'}
                                  onValueChange={v => v && updateTime(s.id, day.value, 'start_time', v)}
                                >
                                  <SelectTrigger className="w-20 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HOURS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={sched?.end_time?.slice(0, 5) ?? '18:00'}
                                  onValueChange={v => v && updateTime(s.id, day.value, 'end_time', v)}
                                >
                                  <SelectTrigger className="w-20 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HOURS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        ) : (
                          // ── Read mode ──────────────────────────────────────
                          working && hours ? (
                            <span className="inline-block text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {hours}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Haz clic en <strong>Editar</strong> debajo del nombre de cada {staffLabel === 'Barberos' ? 'barbero' : 'colaborador'} para modificar su horario.
        </p>
      </TabsContent>

      {/* ── Bloqueos ──────────────────────────────────────────────────────────── */}
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs">
                          {staffName ?? 'Todo el negocio'}
                        </Badge>
                        {b.reason && <p className="text-sm font-medium">{b.reason}</p>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(b.starts_at), "d MMM yyyy · HH:mm", { locale: es })}
                        {' — '}
                        {format(new Date(b.ends_at), "d MMM yyyy · HH:mm", { locale: es })}
                      </p>
                    </div>
                    <Button
                      size="icon" variant="ghost"
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

      {/* ── Dialog bloqueo ────────────────────────────────────────────────────── */}
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
                  <SelectValue placeholder="Todo el negocio">{blockForm.staff_id ? (staff.find(s => s.id === blockForm.staff_id)?.name) : 'Todo el negocio'}</SelectValue>
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
                <Input type="datetime-local" value={blockForm.starts_at}
                  onChange={e => setBlockForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="datetime-local" value={blockForm.ends_at}
                  onChange={e => setBlockForm(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input placeholder="Vacaciones, día festivo..."
                value={blockForm.reason}
                onChange={e => setBlockForm(p => ({ ...p, reason: e.target.value }))} />
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
