'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Organization } from '@/types/database'

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
  { value: 'America/Monterrey', label: 'Monterrey (CST)' },
  { value: 'America/Tijuana', label: 'Tijuana (PST)' },
  { value: 'America/Cancun', label: 'Cancún (EST)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Lima', label: 'Lima (PET)' },
  { value: 'America/Santiago', label: 'Santiago (CLT)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
]

interface Props {
  organization: Organization
}

export function SettingsForm({ organization }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: organization.name ?? '',
    phone: organization.phone ?? '',
    address: organization.address ?? '',
    timezone: organization.timezone ?? 'America/Mexico_City',
    welcome_message: organization.welcome_message ?? '',
    away_message: organization.away_message ?? '',
  })

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleSubscribe() {
    setLoading(true)
    const res = await fetch('/api/stripe-checkout', { method: 'POST' })
    const { url, error } = await res.json()
    if (error) { toast.error(error); setLoading(false); return }
    window.location.href = url
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    setLoading(true)
    const { error } = await supabase
      .from('organizations')
      .update({
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        timezone: form.timezone,
        welcome_message: form.welcome_message || null,
        away_message: form.away_message || null,
      })
      .eq('id', organization.id)

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Configuración guardada')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Datos del negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del negocio</CardTitle>
          <CardDescription>Información general que aparece en los mensajes del bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del negocio</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Teléfono de contacto (opcional)</Label>
            <Input placeholder="+52 312 226 5985" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dirección (opcional)</Label>
            <Input placeholder="Calle, Colonia, Ciudad" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select value={form.timezone} onValueChange={v => set('timezone', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mensajes del bot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensajes del bot</CardTitle>
          <CardDescription>Personaliza cómo responde el asistente de WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensaje de bienvenida (opcional)</Label>
            <Textarea
              placeholder="Ej: ¡Bienvenido a Barber Shop Leo! ¿En qué te puedo ayudar?"
              rows={3}
              value={form.welcome_message}
              onChange={e => set('welcome_message', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Si lo dejas vacío, el bot usa un saludo estándar</p>
          </div>
          <div className="space-y-2">
            <Label>Mensaje fuera de horario (opcional)</Label>
            <Textarea
              placeholder="Ej: Estamos cerrados. Nuestro horario es Lun-Sáb 9am-7pm."
              rows={3}
              value={form.away_message}
              onChange={e => set('away_message', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info de suscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{organization.subscription_status === 'trialing' ? 'Prueba gratuita' : organization.subscription_status}</p>
              {organization.trial_ends_at && (
                <p className="text-sm text-muted-foreground">
                  Vence el {new Date(organization.trial_ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {organization.subscription_status === 'trialing' ? '14 días gratis' : 'Activo'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {(organization.subscription_status === 'trialing' || organization.subscription_status === 'suspended') && (
          <Button variant="outline" onClick={handleSubscribe} disabled={loading}>
            Suscribirme — $499/mes
          </Button>
        )}
      </div>
    </div>
  )
}
