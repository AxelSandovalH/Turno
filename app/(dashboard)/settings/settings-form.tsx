'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ImageUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'
import { BookingQr } from '@/components/dashboard/booking-qr'
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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name:            organization.name            ?? '',
    slug:            organization.slug            ?? '',
    whatsapp_number: organization.whatsapp_number ?? '',
    phone:           organization.phone           ?? '',
    address:         organization.address         ?? '',
    timezone:        organization.timezone        ?? 'America/Mexico_City',
    welcome_message: organization.welcome_message ?? '',
    away_message:    organization.away_message    ?? '',
    primary_color:   organization.primary_color   ?? '#7c3aed',
    logo_url:        organization.logo_url        ?? '',
    deposit_enabled: organization.deposit_enabled ?? false,
    deposit_amount:  organization.deposit_amount ? String(organization.deposit_amount) : '',
  })
  const [slugError, setSlugError] = useState('')

  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo no debe superar 2 MB'); return }
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${organization.id}.${ext}`
    const { error } = await supabase.storage.from('org-assets').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir logo'); setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('org-assets').getPublicUrl(path)
    setForm(p => ({ ...p, logo_url: publicUrl }))
    setUploadingLogo(false)
    toast.success('Logo cargado')
  }

  async function handleSubscribe() {
    setLoading(true)
    const res = await fetch('/api/stripe-checkout', { method: 'POST' })
    const { url, error } = await res.json()
    if (error) { toast.error(error); setLoading(false); return }
    window.location.href = url
  }

  function handleSlugChange(v: string) {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    setForm(p => ({ ...p, slug: clean }))
    setSlugError('')
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) {
      setSlugError('Solo letras minúsculas, números y guiones')
      return
    }
    const depositAmountNum = parseFloat(form.deposit_amount)
    if (form.deposit_enabled && (!form.deposit_amount || isNaN(depositAmountNum) || depositAmountNum <= 0)) {
      return toast.error('Ingresa un monto de anticipo válido')
    }
    setLoading(true)

    // Check slug uniqueness if changed
    if (form.slug && form.slug !== organization.slug) {
      const { data: existing } = await supabase
        .from('organizations').select('id').eq('slug', form.slug).neq('id', organization.id).maybeSingle()
      if (existing) {
        setSlugError('Este slug ya está en uso')
        setLoading(false)
        return
      }
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        name:            form.name,
        slug:            form.slug            || null,
        whatsapp_number: form.whatsapp_number || null,
        phone:           form.phone           || null,
        address:         form.address         || null,
        timezone:        form.timezone,
        welcome_message: form.welcome_message || null,
        away_message:    form.away_message    || null,
        primary_color:   form.primary_color   || null,
        logo_url:        form.logo_url        || null,
        deposit_enabled: form.deposit_enabled,
        deposit_amount:  form.deposit_enabled ? depositAmountNum : 0,
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
          <label style={s.label}>Slug de reserva pública</label>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--background)', border: `1px solid ${slugError ? '#ef4444' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden' }}>
            <span style={{ padding: '0 10px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', height: 38, display: 'flex', alignItems: 'center' }}>
              quickturno.app/book/
            </span>
            <input
              style={{ ...s.input, border: 'none', borderRadius: 0 }}
              placeholder="mi-clinica"
              value={form.slug}
              onChange={e => handleSlugChange(e.target.value)}
            />
          </div>
          {slugError
            ? <p style={{ ...s.hint, color: '#ef4444' }}>{slugError}</p>
            : <p style={s.hint}>Solo letras minúsculas, números y guiones. Ej: <em>fisio-garcia</em></p>
          }
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

      {/* Identidad visual */}
      <div style={s.section}>
        <div>
          <p style={s.sectionTitle}>Identidad visual</p>
          <p style={s.sectionDesc}>Aparece en tu página de reservas pública y en el portal del paciente</p>
        </div>

        {/* Logo */}
        <div>
          <label style={s.label}>Logo del negocio</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 10, background: `${form.primary_color}22`, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: form.primary_color }}>
                {form.name.slice(0, 2).toUpperCase() || 'T'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                style={{ ...s.btn, background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', opacity: uploadingLogo ? 0.6 : 1 }}
              >
                {uploadingLogo ? <Spinner size={14} color="currentColor" /> : <ImageUp size={14} />}
                {uploadingLogo ? 'Subiendo…' : 'Subir logo'}
              </button>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, logo_url: '' }))}
                  style={{ ...s.btn, background: 'transparent', border: 'none', color: 'var(--muted-foreground)', padding: 0, height: 'auto', fontSize: 11 }}
                >
                  Eliminar logo
                </button>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </div>
          <p style={s.hint}>PNG, JPG o SVG. Máx 2 MB. Se mostrará en tu página pública.</p>
        </div>

        {/* Color de marca */}
        <div>
          <label style={s.label}>Color de marca</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={form.primary_color}
              onChange={e => set('primary_color')(e.target.value)}
              style={{ width: 38, height: 38, padding: 2, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}
            />
            <input
              style={{ ...s.input, width: 120 }}
              value={form.primary_color}
              onChange={e => set('primary_color')(e.target.value)}
              placeholder="#7c3aed"
              maxLength={7}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('primary_color')(c)}
                  style={{ width: 24, height: 24, borderRadius: 6, background: c, border: form.primary_color === c ? '2px solid var(--foreground)' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Ver página pública + QR */}
        {form.slug && (
          <div style={{ paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => window.open(`/book/${form.slug}`, '_blank')}
              style={{ ...s.btn, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              <span style={{ fontSize: 13 }}>↗</span>
              Ver mi página de reservas
            </button>
            <BookingQr slug={form.slug} businessName={form.name || organization.name} />
          </div>
        )}
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

      {/* Anticipos */}
      <div style={s.section}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={s.sectionTitle}>Anticipo por Stripe</p>
            <p style={s.sectionDesc}>El bot pide un pago para confirmar cada cita agendada por WhatsApp</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, deposit_enabled: !p.deposit_enabled }))}
            style={{
              flexShrink: 0, width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: form.deposit_enabled ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background .15s',
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: form.deposit_enabled ? 20 : 2,
              width: 18, height: 18, borderRadius: 99, background: '#fff', transition: 'left .15s',
            }} />
          </button>
        </div>

        {form.deposit_enabled && (
          <div>
            <label style={s.label}>Monto del anticipo (MXN)</label>
            <input
              style={s.input}
              type="number"
              min="1"
              step="1"
              placeholder="100"
              value={form.deposit_amount}
              onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))}
            />
            <p style={s.hint}>
              El cliente recibe un link de pago por WhatsApp al agendar. Si no paga en 20 minutos, el horario se libera automáticamente.
            </p>
          </div>
        )}
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
