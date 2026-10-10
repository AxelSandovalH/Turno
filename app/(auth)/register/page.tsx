'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { ALL_PROFILES } from '@/lib/profiles/registry'
import { isPlanKey, PLANS, DEFAULT_PLAN, type PlanKey } from '@/lib/plans'
import { buildPhone } from '@/lib/booking-format'
import { GoogleButton } from '@/components/auth/google-button'

const s = {
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 7, fontFamily: 'inherit' } as React.CSSProperties,
  wrap: { display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #252525', borderRadius: 10, height: 48, paddingLeft: 12, transition: 'border-color .15s', background: '#141414' } as React.CSSProperties,
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ebebeb', fontSize: 14, height: '100%', paddingRight: 12, fontFamily: 'inherit' } as React.CSSProperties,
}

const TYPES = ALL_PROFILES.map(p => ({ value: p.type, label: `${p.emoji} ${p.displayName}` }))
const PLAN_LIST = [PLANS.agenda, PLANS.asistente, PLANS.pedidos]

const IconBuilding = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 7l9-4 9 4M4 11h16v10H4zM9 21v-4h6v4" />
  </svg>
)
const IconPhone = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.67 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 5.45 5.45l1.08-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
  </svg>
)
const IconMail = () => (
  <svg width={18} height={18} viewBox="0 0 32 32" fill="#555">
    <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z" />
  </svg>
)
const IconLock = () => (
  <svg width={18} height={18} viewBox="-64 0 512 512" fill="#555">
    <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" />
    <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" />
  </svg>
)

interface FieldProps {
  label: string; icon: React.ReactNode; type: string; placeholder: string
  value: string; onChange: (v: string) => void; name: string
  hint?: string; minLength?: number; required?: boolean; autoFocus?: boolean
  prefix?: string; right?: React.ReactNode; inputMode?: 'tel' | 'email' | 'text'; autoComplete?: string
}

function Field({ label, icon, type, placeholder, value, onChange, name, hint, minLength, required, autoFocus, prefix, right, inputMode, autoComplete }: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={s.label}>{label}</label>
      <div style={{ ...s.wrap, borderColor: focused ? '#7c3aed' : '#252525' }}>
        {icon}
        {prefix && <span style={{ fontSize: 14, color: '#777', marginLeft: -2 }}>{prefix}</span>}
        <input
          name={name} type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          required={required} autoFocus={autoFocus} minLength={minLength}
          inputMode={inputMode} autoComplete={autoComplete}
          style={s.input}
        />
        {right}
      </div>
      {hint && <p style={{ fontSize: 11, color: '#4a4a4a', marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

/** Teléfono del negocio: 10 dígitos de México (se guarda como 521…) o internacional con "+". */
function parseBusinessPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) {
    if (digits.startsWith('52')) return buildPhone('52', digits.slice(2))
    return digits.length >= 8 && digits.length <= 15 ? digits : ''
  }
  return buildPhone('52', digits)
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null)
  // Usuario que ya entró con Google pero aún no tiene negocio: solo falta crearlo
  const [googleUser, setGoogleUser] = useState<{ id: string; email: string; firstName: string } | null>(null)
  const [planKey, setPlanKey] = useState<PlanKey>(DEFAULT_PLAN)
  const [form, setForm] = useState({
    businessName: '', email: '', password: '', whatsappNumber: '', businessType: 'barbershop',
  })
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  // El plan y el giro van de la mano: Pedidos es para restaurantes, y al revés
  function choosePlan(key: PlanKey) {
    setPlanKey(key)
    setForm(p => ({
      ...p,
      businessType: key === 'pedidos' ? 'restaurant' : p.businessType === 'restaurant' ? 'barbershop' : p.businessType,
    }))
  }
  function chooseType(type: string) {
    setForm(p => ({ ...p, businessType: type }))
    if (type === 'restaurant') setPlanKey('pedidos')
    else if (planKey === 'pedidos') setPlanKey('asistente')
  }

  // Compra directa desde el anuncio: llega de Stripe ya pagado (?session_id=...).
  // Desde la landing puede venir el plan elegido (?plan=agenda|asistente|pedidos).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session_id')
    if (sid) setPaidSessionId(sid)
    const plan = params.get('plan')
    if (isPlanKey(plan)) {
      setPlanKey(plan)
      if (plan === 'pedidos') setForm(p => ({ ...p, businessType: 'restaurant' }))
    }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      if (u.user_metadata?.organization_id) { router.push('/appointments'); return }
      const full = String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? '')
      setGoogleUser({ id: u.id, email: u.email ?? '', firstName: full.split(' ')[0] })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Google ya inició sesión: si ya tiene negocio va al panel; si no, completa los datos aquí
  function handleGoogleSignedIn(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
    if (u.user_metadata?.organization_id) { router.push('/appointments'); router.refresh(); return }
    const full = String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? '')
    setGoogleUser({ id: u.id, email: u.email ?? '', firstName: full.split(' ')[0] })
  }

  const plan = PLANS[planKey]

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    const whatsappNumber = parseBusinessPhone(form.whatsappNumber)
    if (!whatsappNumber) {
      toast.error('Escribe el WhatsApp de tu negocio con 10 dígitos')
      return
    }

    setLoading(true)
    const slug = form.businessName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // 1. Crear usuario (con Google ya existe: solo falta su negocio)
    let userId: string
    let userEmail: string
    let hasSession = false
    if (googleUser) {
      userId = googleUser.id
      userEmail = googleUser.email
      hasSession = true
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError || !authData.user) {
        const already = /already|registered/i.test(authError?.message ?? '')
        toast.error(already ? 'Ese correo ya tiene una cuenta. Inicia sesión para continuar.' : (authError?.message ?? 'Error al crear la cuenta'))
        setLoading(false)
        return
      }
      userId = authData.user.id
      userEmail = form.email
      hasSession = !!authData.session
    }

    // 2. Crear organización
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name: form.businessName,
        slug,
        whatsappNumber,
        email: userEmail,
        businessType: form.businessType,
        stripeSessionId: paidSessionId,
      }),
    })
    const onboarding = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(onboarding?.error ?? 'Error al configurar el negocio')
      setLoading(false)
      return
    }

    // 3. Asegurar sesión activa (por si Supabase requiere confirmación de email)
    if (googleUser) {
      await supabase.auth.refreshSession() // para que la sesión ya traiga el negocio nuevo
    } else if (!hasSession) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInError) {
        toast.error('Cuenta creada. Inicia sesión para continuar.')
        router.push('/login')
        return
      }
    }

    // Si pagó desde el anuncio, la org ya quedó activa — directo al panel.
    // Si no, directo a Stripe con el plan que eligió en esta misma pantalla.
    router.push(onboarding?.alreadyPaid ? '/appointments' : `/payment?auto=1&plan=${planKey}`)
    router.refresh()
  }

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      {/* Progreso: dos pasos, sin sorpresas */}
      {!paidSessionId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12 }}>
          <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{googleUser ? '1 · Tu negocio' : '1 · Tu cuenta'}</span>
          <span style={{ flex: 1, height: 1, background: '#252525' }} />
          <span style={{ color: '#555' }}>2 · Pago seguro</span>
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 4 }}>
          {paidSessionId ? '¡Pago recibido! Activa tu negocio' : googleUser ? `Casi listo${googleUser.firstName ? `, ${googleUser.firstName}` : ''}` : 'Empieza en un minuto'}
        </h1>
        <p style={{ fontSize: 13, color: paidSessionId ? '#10b981' : '#555' }}>
          {paidSessionId
            ? 'Tu suscripción ya está pagada. Este último paso activa tu negocio.'
            : googleUser
              ? `Entraste con ${googleUser.email}. Solo falta lo de tu negocio.`
              : 'Elige tu plan, llena 4 datos y listo. Sin contratos, cancelas cuando quieras.'}
        </p>
      </div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Plan */}
        {!paidSessionId && (
          <div>
            <label style={s.label}>Tu plan</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLAN_LIST.map(pl => {
                const active = planKey === pl.key
                return (
                  <button
                    key={pl.key}
                    type="button"
                    onClick={() => choosePlan(pl.key)}
                    aria-pressed={active}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
                      border: `1.5px solid ${active ? '#7c3aed' : '#252525'}`, background: active ? '#7c3aed18' : '#141414',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s', width: '100%',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: 99, flexShrink: 0,
                      border: `2px solid ${active ? '#7c3aed' : '#333'}`, background: active ? '#7c3aed' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <span style={{ width: 5, height: 5, borderRadius: 99, background: '#fff' }} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: active ? '#e9e3ff' : '#ccc' }}>
                        {pl.name.replace('Turno — ', '')}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#666', marginTop: 1 }}>{pl.description}</span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: active ? '#e9e3ff' : '#aaa', whiteSpace: 'nowrap' }}>
                      {pl.priceLabel}<span style={{ fontSize: 10.5, fontWeight: 400, color: '#666' }}>/mes</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!googleUser && (
          <>
            <GoogleButton
              onSignedIn={handleGoogleSignedIn}
              fallbackRedirectTo={`?plan=${planKey}${paidSessionId ? `&session_id=${paidSessionId}` : ''}`}
              disabled={loading}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#252525' }} />
              <span style={{ fontSize: 12, color: '#444' }}>o con tu correo</span>
              <div style={{ flex: 1, height: 1, background: '#252525' }} />
            </div>
          </>
        )}

        <Field label="Nombre del negocio" icon={<IconBuilding />} type="text" placeholder="Barbería El Estilo" name="businessName" value={form.businessName} onChange={set('businessName')} required autoFocus autoComplete="organization" />

        {/* Tipo de negocio */}
        <div>
          <label style={s.label}>Tipo de negocio</label>
          <select
            value={form.businessType}
            onChange={e => chooseType(e.target.value)}
            style={{ ...s.wrap, width: '100%', paddingRight: 12, color: '#ebebeb', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', appearance: 'auto' }}
          >
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <Field label="WhatsApp del negocio" icon={<IconPhone />} type="tel" inputMode="tel" prefix="+52" placeholder="624 123 4567" name="whatsappNumber" value={form.whatsappNumber} onChange={set('whatsappNumber')} hint="Tus 10 dígitos. Es el número donde recibirás los avisos." required autoComplete="tel-national" />
        {!googleUser && (
          <>
            <Field label="Correo electrónico" icon={<IconMail />} type="email" inputMode="email" placeholder="tu@negocio.com" name="email" value={form.email} onChange={set('email')} required autoComplete="email" />
            <Field
              label="Contraseña" icon={<IconLock />} type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" name="password"
              value={form.password} onChange={set('password')} minLength={8} required autoComplete="new-password"
              right={
                <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ background: 'none', border: 'none', color: '#777', fontSize: 12, cursor: 'pointer', padding: '0 12px', fontFamily: 'inherit' }}>
                  {showPass ? 'Ocultar' : 'Mostrar'}
                </button>
              }
            />

          </>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 6, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, height: 50, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'opacity .15s' }}
        >
          {loading ? <Spinner size={20} color="#fff" /> : paidSessionId ? 'Activar mi negocio →' : `Continuar al pago · ${plan.priceLabel} MXN/mes →`}
        </button>
        {!paidSessionId && (
          <p style={{ textAlign: 'center', fontSize: 11.5, color: '#4a4a4a', marginTop: -4 }}>
            Pagas de forma segura en Stripe. Cancela cuando quieras.
          </p>
        )}
      </form>

      <p style={{ textAlign: 'center', color: '#555', fontSize: 13, marginTop: 20 }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" style={{ color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
