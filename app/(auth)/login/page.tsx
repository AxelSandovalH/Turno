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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }
    router.push('/appointments')
    router.refresh()
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

      <p style={{ textAlign: 'center', color: '#555', fontSize: 13, margin: '20px 0 16px' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/register" style={{ color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
          Regístrate gratis
        </Link>
      </p>

    </div>
  )
}
