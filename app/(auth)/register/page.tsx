'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'

const s = {
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 7, fontFamily: 'inherit' } as React.CSSProperties,
  wrap: { display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #252525', borderRadius: 10, height: 48, paddingLeft: 12, transition: 'border-color .15s', background: '#141414' } as React.CSSProperties,
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ebebeb', fontSize: 14, height: '100%', paddingRight: 12, fontFamily: 'inherit' } as React.CSSProperties,
}

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
  label: string
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  name: string
  hint?: string
  minLength?: number
  required?: boolean
  autoFocus?: boolean
}

function Field({ label, icon, type, placeholder, value, onChange, name, hint, minLength, required, autoFocus }: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={s.label}>{label}</label>
      <div style={{ ...s.wrap, borderColor: focused ? '#7c3aed' : '#252525' }}>
        {icon}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoFocus={autoFocus}
          minLength={minLength}
          style={s.input}
        />
      </div>
      {hint && <p style={{ fontSize: 11, color: '#3d3d3d', marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ businessName: '', email: '', password: '', whatsappNumber: '' })
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const slug = form.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authError || !authData.user) { toast.error(authError?.message ?? 'Error al crear la cuenta'); setLoading(false); return }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authData.user.id, name: form.businessName, slug, whatsappNumber: form.whatsappNumber, email: form.email }),
    })

    if (!res.ok) { const { error } = await res.json(); toast.error(error ?? 'Error'); setLoading(false); return }
    toast.success('¡Cuenta creada!')
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 4 }}>Crea tu cuenta</h1>
        <p style={{ fontSize: 13, color: '#555' }}>14 días gratis · Sin tarjeta de crédito</p>
      </div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nombre del negocio" icon={<IconBuilding />} type="text" placeholder="Barbería El Estilo" name="businessName" value={form.businessName} onChange={set('businessName')} required autoFocus />
        <Field label="WhatsApp del negocio" icon={<IconPhone />} type="tel" placeholder="521XXXXXXXXXX" name="whatsappNumber" value={form.whatsappNumber} onChange={set('whatsappNumber')} hint="Formato internacional sin +. Ej: 521XXXXXXXXXX" required />
        <Field label="Correo electrónico" icon={<IconMail />} type="email" placeholder="tu@negocio.com" name="email" value={form.email} onChange={set('email')} required />
        <Field label="Contraseña" icon={<IconLock />} type="password" placeholder="Mínimo 8 caracteres" name="password" value={form.password} onChange={set('password')} minLength={8} required />

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 8, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 10, height: 48, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'opacity .15s' }}
        >
          {loading ? <Spinner size={20} color="#fff" /> : 'Comenzar prueba gratis'}
        </button>
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
