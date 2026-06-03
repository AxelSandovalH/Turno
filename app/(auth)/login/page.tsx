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

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailFocus, setEmailFocus] = useState(false)
  const [passFocus, setPassFocus] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }
    const meta = data.user?.user_metadata ?? {}
    if (meta.is_platform_admin) {
      router.push('/admin')
    } else {
      router.push('/appointments')
    }
    router.refresh()
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

return (
    <div style={{ fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 4 }}>
          Bienvenido de nuevo
        </h1>
        <p style={{ fontSize: 13, color: '#555' }}>Ingresa a tu panel de control</p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={s.label}>Correo electrónico</label>
          <div style={{ ...s.wrap, borderColor: emailFocus ? '#7c3aed' : '#252525' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 32 32" fill="#555">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z" />
            </svg>
            <input
              type="email"
              placeholder="tu@negocio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
              required
              autoFocus
              style={s.input}
            />
          </div>
        </div>

        <div>
          <label style={s.label}>Contraseña</label>
          <div style={{ ...s.wrap, borderColor: passFocus ? '#7c3aed' : '#252525' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="-64 0 512 512" fill="#555">
              <path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" />
              <path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" />
            </svg>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
              required
              style={s.input}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 8, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 10, height: 48, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'opacity .15s' }}
        >
          {loading ? <Spinner size={20} color="#fff" /> : 'Entrar'}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#252525' }} />
        <span style={{ fontSize: 12, color: '#444' }}>o continúa con</span>
        <div style={{ flex: 1, height: 1, background: '#252525' }} />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        style={{ width: '100%', height: 48, border: '1.5px solid #252525', borderRadius: 10, background: '#141414', color: '#ebebeb', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', transition: 'border-color .15s, background .15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#252525')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuar con Google
      </button>

      <p style={{ textAlign: 'center', color: '#555', fontSize: 13, margin: '20px 0 0' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" style={{ color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
          Regístrate gratis
        </Link>
      </p>

    </div>
  )
}
