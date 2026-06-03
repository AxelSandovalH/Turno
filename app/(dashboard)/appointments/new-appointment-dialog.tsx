'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  organizationId: string
  staff: { id: string; name: string }[]
  services: { id: string; name: string; duration_minutes: number; price: number | null }[]
  customers: { id: string; name: string | null; phone: string }[]
}

export function NewAppointmentDialog({ organizationId, staff, services, customers }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    new_customer_name: '',
    new_customer_phone: '',
    staff_id: '',
    service_id: '',
    date: '',
    time: '',
    notes: '',
  })
  const [mode, setMode] = useState<'existing' | 'new'>('existing')

  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const selectedService = services.find(s => s.id === form.service_id)

  async function handleCreate() {
    if (!form.staff_id || !form.service_id || !form.date || !form.time) {
      return toast.error('Completa todos los campos obligatorios')
    }

    setLoading(true)
    try {
      let customerId = form.customer_id

      // Create customer if new
      if (mode === 'new') {
        if (!form.new_customer_phone) { toast.error('El teléfono es requerido'); setLoading(false); return }
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .upsert({
            organization_id: organizationId,
            name: form.new_customer_name || null,
            phone: form.new_customer_phone,
          }, { onConflict: 'organization_id,phone' })
          .select('id')
          .single()
        if (custErr || !newCustomer) { toast.error('Error al crear cliente'); setLoading(false); return }
        customerId = newCustomer.id
      }

      if (!customerId) { toast.error('Selecciona o crea un cliente'); setLoading(false); return }

      const startsAt = new Date(`${form.date}T${form.time}:00`)
      const duration = selectedService?.duration_minutes ?? 60
      const endsAt = new Date(startsAt.getTime() + duration * 60000)

      // Check for overlapping appointments with the same staff member
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, starts_at, ends_at')
        .eq('staff_id', form.staff_id)
        .eq('organization_id', organizationId)
        .in('status', ['confirmed'])
        .lt('starts_at', endsAt.toISOString())
        .gt('ends_at', startsAt.toISOString())

      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0]
        const conflictTime = new Date(conflict.starts_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        toast.error(`Ese horario ya está ocupado (cita a las ${conflictTime})`)
        setLoading(false)
        return
      }

      // Get branch
      const { data: branch } = await supabase
        .from('branches')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle()

      const { error } = await supabase.from('appointments').insert({
        organization_id: organizationId,
        branch_id: branch?.id ?? null,
        customer_id: customerId,
        staff_id: form.staff_id,
        service_id: form.service_id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'confirmed',
        notes: form.notes || null,
      })

      if (error) { toast.error(error.message); setLoading(false); return }

      toast.success('Cita creada')
      setOpen(false)
      setForm({ customer_id: '', new_customer_name: '', new_customer_phone: '', staff_id: '', service_id: '', date: '', time: '', notes: '' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" />
        Nueva cita
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva cita manual</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('existing')}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${mode === 'existing' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Existente
                </button>
                <button
                  onClick={() => setMode('new')}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${mode === 'new' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Nuevo
                </button>
              </div>

              {mode === 'existing' ? (
                <Select value={form.customer_id} onValueChange={v => set('customer_id')(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Busca un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name ?? c.phone} {c.name ? `· ${c.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nombre" value={form.new_customer_name} onChange={e => set('new_customer_name')(e.target.value)} />
                  <Input placeholder="Teléfono *" value={form.new_customer_phone} onChange={e => set('new_customer_phone')(e.target.value)} />
                </div>
              )}
            </div>

            {/* Servicio */}
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select value={form.service_id} onValueChange={v => set('service_id')(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.duration_minutes} min{s.price ? ` · $${s.price}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff */}
            <div className="space-y-2">
              <Label>Profesional</Label>
              <Select value={form.staff_id} onValueChange={v => set('staff_id')(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={e => set('date')(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={form.time} onChange={e => set('time')(e.target.value)} />
              </div>
            </div>

            {selectedService && (
              <p className="text-xs text-muted-foreground">
                Duración: {selectedService.duration_minutes} min
                {selectedService.price ? ` · Precio: $${selectedService.price}` : ''}
              </p>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input placeholder="Observaciones..." value={form.notes} onChange={e => set('notes')(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Guardando...' : 'Crear cita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
