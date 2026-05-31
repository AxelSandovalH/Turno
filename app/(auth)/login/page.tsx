'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push('/appointments')
    router.refresh()
  }

  return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Bienvenido de nuevo
        </h1>
        <p style={{ fontSize: 14, color: '#555555', letterSpacing: '-0.01em' }}>
          Ingresa a tu panel de control
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="email" style={labelStyle}>Correo electrónico</label>
          <input
            id="email"
            type="email"
            placeholder="tu@negocio.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#252525' }}
          />
        </div>

        <div>
          <label htmlFor="password" style={labelStyle}>Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#252525' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 8,
            background: loading ? '#5b21b6' : '#7c3aed',
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
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: '#555555', textAlign: 'center', marginTop: 28, letterSpacing: '-0.01em' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" style={{ color: '#ebebeb', textDecoration: 'none' }}>
          Regístrate gratis
        </Link>
      </p>
    </div>
  )
}
