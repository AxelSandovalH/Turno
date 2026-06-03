'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'
import type { Organization } from '@/types/database'

const TIMEZONES = [
  { value: 'America/Mexico_City',            label: 'Ciudad de México (CST)' },
  { value: 'America/Monterrey',              label: 'Monterrey (CST)' },
  { value: 'America/Tijuana',                label: 'Tijuana (PST)' },
  { value: 'America/Cancun',                 label: 'Cancún (EST)' },
  { value: 'America/Bogota',                 label: 'Bogotá (COT)' },
  { value: 'America/Lima',                   label: 'Lima (PET)' },
  { value: 'America/Santiago',               label: 'Santiago (CLT)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
]

const s = {
  section: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 } as React.CSSProperties,
  sectionDesc: { fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4 } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 } as React.CSSProperties,
  input: { width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, height: 38, padding: '0 12px', fontSize: 13, color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  textarea: { width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--foreground)', outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box', fontFamily: 'inherit' } as React.CSSProperties,
  select: { width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, height: 38, padding: '0 12px', fontSize: 13, color: 'var(--foreground)', outline: 'none', appearance: 'none', cursor: 'pointer' } as React.CSSProperties,
  hint: { fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 } as React.CSSProperties,
  btn: { height: 38, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
}

interface Props { organization: Organization }

export function SettingsForm({ organization }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:            organization.name            ?? '',
    whatsapp_number: organization.whatsapp_number ?? '',
    phone:           organization.phone           ?? '',
    address:         organization.address         ?? '',
    timezone:        organization.timezone        ?? 'America/Mexico_City',
    welcome_message: organization.welcome_message ?? '',
    away_message:    organization.away_message    ?? '',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

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
        name:            form.name,
        whatsapp_number: form.whatsapp_number || null,
        phone:           form.phone           || null,
        address:         form.address         || null,
        timezone:        form.timezone,
        welcome_message: form.welcome_message || null,
        away_message:    form.away_message    || null,
      })
      .eq('id', organization.id)

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Configuración guardada')
    router.refresh()
  }

  const status = organization.subscription_status

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Datos del negocio */}
      <div style={s.section}>
        <div>
          <p style={s.sectionTitle}>Datos del negocio</p>
          <p style={s.sectionDesc}>Información general que usa el bot de WhatsApp</p>
        </div>
        <div>
          <label style={s.label}>Nombre del negocio</label>
          <input style={s.input} value={form.name} onChange={e => set('name')(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>WhatsApp del negocio</label>
          <input style={s.input} placeholder="521XXXXXXXXXX" value={form.whatsapp_number} onChange={e => set('whatsapp_number')(e.target.value)} />
          <p style={s.hint}>Formato internacional sin +. Ej: 521XXXXXXXXXX</p>
        </div>
        <div>
          <label style={s.label}>Teléfono de contacto (opcional)</label>
          <input style={s.input} placeholder="+52 312 000 0000" value={form.phone} onChange={e => set('phone')(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Dirección (opcional)</label>
          <input style={s.input} placeholder="Calle, Colonia, Ciudad" value={form.address} onChange={e => set('address')(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Zona horaria</label>
          <select style={s.select} value={form.timezone} onChange={e => set('timezone')(e.target.value)}>
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensajes del bot */}
      <div style={s.section}>
        <div>
          <p style={s.sectionTitle}>Mensajes del bot</p>
          <p style={s.sectionDesc}>Personaliza cómo responde el asistente de WhatsApp</p>
        </div>
        <div>
          <label style={s.label}>Mensaje de bienvenida (opcional)</label>
          <textarea
            style={s.textarea}
            placeholder="Ej: ¡Bienvenido! ¿En qué te puedo ayudar?"
            value={form.welcome_message}
            onChange={e => set('welcome_message')(e.target.value)}
          />
          <p style={s.hint}>Si lo dejas vacío, el bot usa un saludo estándar</p>
        </div>
        <div>
          <label style={s.label}>Mensaje fuera de horario (opcional)</label>
          <textarea
            style={s.textarea}
            placeholder="Ej: Estamos cerrados. Nuestro horario es Lun-Sáb 9am-7pm."
            value={form.away_message}
            onChange={e => set('away_message')(e.target.value)}
          />
        </div>
      </div>

      {/* Plan */}
      <div style={s.section}>
        <p style={s.sectionTitle}>Plan</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>Turno AI</p>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>$2,799 MXN / mes</p>
          </div>
          {status === 'active' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 10px', borderRadius: 99 }}>Activo</span>
          )}
          {status === 'suspended' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 10px', borderRadius: 99 }}>Suspendido</span>
          )}
          {status !== 'active' && status !== 'suspended' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize' }}>{status}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{ ...s.btn, flex: 1, background: 'var(--primary)', color: '#fff', justifyContent: 'center', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? <Spinner size={16} color="#fff" /> : 'Guardar cambios'}
        </button>
        {status === 'suspended' && (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{ ...s.btn, background: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            Reactivar suscripción
          </button>
        )}
      </div>
    </div>
  )
}
