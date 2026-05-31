'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  borderRadius: 8,
  background: '#141414',
  border: '1px solid #252525',
  color: '#ebebeb',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 400,
  color: '#888888',
  marginBottom: 8,
  letterSpacing: '-0.01em',
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    password: '',
    whatsappNumber: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#7c3aed'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#252525'
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const slug = form.businessName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        name: form.businessName,
        slug,
        whatsappNumber: form.whatsappNumber,
        email: form.email,
      }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      toast.error(error ?? 'Error al configurar el negocio')
      setLoading(false)
      return
    }

    toast.success('¡Cuenta creada!')
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Crea tu cuenta
        </h1>
        <p style={{ fontSize: 14, color: '#555555', letterSpacing: '-0.01em' }}>
          14 días gratis · Sin tarjeta de crédito
        </p>
      </div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="businessName" style={labelStyle}>Nombre del negocio</label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            placeholder="Barbería El Estilo"
            value={form.businessName}
            onChange={handleChange}
            required
            autoFocus
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        <div>
          <label htmlFor="whatsappNumber" style={labelStyle}>WhatsApp del negocio</label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            placeholder="521XXXXXXXXXX"
            value={form.whatsappNumber}
            onChange={handleChange}
            required
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
          <p style={{ fontSize: 12, color: '#3d3d3d', marginTop: 6, letterSpacing: '-0.01em' }}>
            Formato internacional sin +. Ej: 521XXXXXXXXXX
          </p>
        </div>

        <div>
          <label htmlFor="email" style={labelStyle}>Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="tu@negocio.com"
            value={form.email}
            onChange={handleChange}
            required
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        <div>
          <label htmlFor="password" style={labelStyle}>Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 8,
            background: '#7c3aed',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.15s, opacity 0.15s',
            marginTop: 4,
          }}
        >
          {loading ? <Spinner size={18} color="#fff" /> : 'Comenzar prueba gratis'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: '#555555', textAlign: 'center', marginTop: 28, letterSpacing: '-0.01em' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" style={{ color: '#ebebeb', textDecoration: 'none' }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
