'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Inicio de sesión con Google SIN pasar por la dirección de Supabase: se usa el botón
// oficial de Google (Google Identity Services) y el token se entrega a Supabase con
// signInWithIdToken. Google muestra el nombre de la app, no el dominio del proyecto.
// Si falta NEXT_PUBLIC_GOOGLE_CLIENT_ID se usa el flujo de redirección de siempre.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface GoogleId {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void; nonce?: string; ux_mode?: string; use_fedcm_for_prompt?: boolean }) => void
  renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void
}
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector<HTMLScriptElement>('script[data-gsi]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('gsi')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.dataset.gsi = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('gsi'))
    document.head.appendChild(s)
  })
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

interface Props {
  /** Se llama cuando Google ya inició sesión; el padre decide a dónde seguir */
  onSignedIn: (user: User) => void
  /** Adónde regresar si se usa el flujo de redirección (sin client id). Puede traer ?plan= */
  fallbackRedirectTo: string
  disabled?: boolean
}

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export function GoogleButton({ onSignedIn, fallbackRedirectTo, disabled }: Props) {
  const supabase = createClient()
  const holder = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  // Callbacks siempre al día sin reinicializar el botón de Google
  const onSignedInRef = useRef(onSignedIn)
  useEffect(() => { onSignedInRef.current = onSignedIn }, [onSignedIn])

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false
    ;(async () => {
      try {
        await loadGsi()
        if (cancelled || !holder.current || !window.google) return
        const rawNonce = crypto.randomUUID()
        const hashedNonce = await sha256Hex(rawNonce)
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashedNonce,
          callback: async ({ credential }) => {
            const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce: rawNonce })
            if (error || !data.user) {
              toast.error('No se pudo entrar con Google. Intenta de nuevo o usa tu correo.')
              return
            }
            onSignedInRef.current(data.user)
          },
        })
        const width = Math.min(400, Math.max(200, holder.current.offsetWidth || 340))
        window.google.accounts.id.renderButton(holder.current, {
          type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with',
          shape: 'rectangular', logo_alignment: 'center', locale: 'es', width,
        })
        setReady(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sin client id (o si el script de Google no carga): flujo de redirección clásico
  if (!CLIENT_ID || failed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback${fallbackRedirectTo}` },
          })
          if (error) toast.error('No se pudo conectar con Google. Intenta con tu correo.')
        }}
        style={{ width: '100%', height: 48, border: '1.5px solid #252525', borderRadius: 10, background: '#141414', color: '#ebebeb', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}
      >
        <GoogleLogo />
        Continuar con Google
      </button>
    )
  }

  return (
    <div style={{ minHeight: 44, display: 'flex', justifyContent: 'center', opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div ref={holder} style={{ width: '100%', display: 'flex', justifyContent: 'center', visibility: ready ? 'visible' : 'hidden' }} />
    </div>
  )
}
