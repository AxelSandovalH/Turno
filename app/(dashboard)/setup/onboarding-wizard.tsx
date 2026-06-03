'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { CheckCircle, ChevronRight, Scissors, Clock } from 'lucide-react'

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

interface Props {
  organizationId: string
  organizationName: string
  staffId: string | null
}

type Step = 'services' | 'schedule' | 'done'

export function OnboardingWizard({ organizationId, organizationName, staffId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('services')
  const [loading, setLoading] = useState(false)

  // Services step
  const [services, setServices] = useState([
    { name: 'Corte', duration_minutes: '30', price: '100' },
  ])

  // Schedule step
  const [schedule, setSchedule] = useState(
    DAYS.map(d => ({
      day: d.value,
      label: d.label,
      is_working: d.value >= 1 && d.value <= 6, // Mon-Sat default
      start_time: '09:00',
      end_time: '19:00',
    }))
  )

  function addService() {
    setServices(p => [...p, { name: '', duration_minutes: '30', price: '' }])
  }

  function removeService(i: number) {
    setServices(p => p.filter((_, idx) => idx !== i))
  }

  function updateService(i: number, field: string, value: string) {
    setServices(p => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function toggleDay(i: number) {
    setSchedule(p => p.map((d, idx) => idx === i ? { ...d, is_working: !d.is_working } : d))
  }

  function updateTime(i: number, field: 'start_time' | 'end_time', value: string) {
    setSchedule(p => p.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  async function saveServices() {
    const valid = services.filter(s => s.name.trim())
    if (valid.length === 0) return toast.error('Agrega al menos un servicio')

    setLoading(true)
    const { error } = await supabase.from('services').insert(
      valid.map(s => ({
        organization_id: organizationId,
        name: s.name.trim(),
        duration_minutes: parseInt(s.duration_minutes) || 30,
        price: s.price ? parseFloat(s.price) : null,
        is_active: true,
      }))
    )
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setStep('schedule')
  }

  async function saveSchedule() {
    if (!staffId) {
      toast.error('No hay barbero registrado')
      return
    }

    const workingDays = schedule.filter(d => d.is_working)
    if (workingDays.length === 0) return toast.error('Activa al menos un día de trabajo')

    setLoading(true)

    // Upsert schedules for owner staff
    const rows = schedule.map(d => ({
      organization_id: organizationId,
      staff_id: staffId,
      day_of_week: d.day,
      is_working: d.is_working,
      start_time: d.start_time,
      end_time: d.end_time,
    }))

    const { error } = await supabase
      .from('staff_schedules')
      .upsert(rows, { onConflict: 'staff_id,day_of_week' })

    setLoading(false)
    if (error) { toast.error(error.message); return }
    setStep('done')
  }

  if (step === 'done') {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-10 space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">¡Listo, {organizationName}!</h2>
          <p className="text-muted-foreground text-sm">
            Tu recepcionista de WhatsApp ya está configurada. Los clientes pueden empezar a agendar.
          </p>
          <Button className="w-full mt-4" onClick={() => router.push('/appointments')}>
            Ver mis citas
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
        <span className={step === 'services' ? 'text-primary font-medium' : ''}>
          1. Servicios
        </span>
        <ChevronRight className="h-4 w-4" />
        <span className={step === 'schedule' ? 'text-primary font-medium' : ''}>
          2. Horario
        </span>
      </div>

      {step === 'services' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <CardTitle>¿Qué servicios ofreces?</CardTitle>
            </div>
            <CardDescription>El bot los usará para agendar citas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Servicio</Label>
                  <Input
                    placeholder="Corte"
                    value={s.name}
                    onChange={e => updateService(i, 'name', e.target.value)}
                    autoFocus={i === 0}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minutos</Label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={s.duration_minutes}
                    onChange={e => updateService(i, 'duration_minutes', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Precio $</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={s.price}
                    onChange={e => updateService(i, 'price', e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground mb-0.5"
                  onClick={() => removeService(i)}
                  disabled={services.length === 1}
                >
                  ×
                </Button>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addService}>
              + Agregar servicio
            </Button>

            <Button className="w-full" onClick={saveServices} disabled={loading}>
              {loading ? 'Guardando...' : 'Continuar'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'schedule' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>¿Cuándo trabajas?</CardTitle>
            </div>
            <CardDescription>El bot solo ofrecerá citas en estos horarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.map((d, i) => (
              <div key={d.day} className={`flex items-center gap-3 py-2 border-b last:border-0 ${!d.is_working ? 'opacity-50' : ''}`}>
                <Switch checked={d.is_working} onCheckedChange={() => toggleDay(i)} />
                <span className="w-24 text-sm font-medium">{d.label}</span>
                {d.is_working && (
                  <>
                    <Input
                      type="time"
                      value={d.start_time}
                      onChange={e => updateTime(i, 'start_time', e.target.value)}
                      className="h-8 w-28 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      type="time"
                      value={d.end_time}
                      onChange={e => updateTime(i, 'end_time', e.target.value)}
                      className="h-8 w-28 text-sm"
                    />
                  </>
                )}
              </div>
            ))}

            <Button className="w-full mt-2" onClick={saveSchedule} disabled={loading}>
              {loading ? 'Guardando...' : '¡Finalizar configuración!'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
