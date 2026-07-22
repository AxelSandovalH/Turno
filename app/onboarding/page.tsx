'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { ALL_PROFILES } from '@/lib/profiles/registry'

const s = {
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 7, fontFamily: 'inherit' } as React.CSSProperties,
  wrap: { display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #252525', borderRadius: 10, height: 48, paddingLeft: 12, transition: 'border-color .15s', background: '#141414' } as React.CSSProperties,
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ebebeb', fontSize: 14, height: '100%', paddingRight: 12, fontFamily: 'inherit' } as React.CSSProperties,
}

const TYPES = ALL_PROFILES.map(p => ({ value: p.type, label: `${p.emoji} ${p.displayName}` }))

function FocusInput({ label, placeholder, value, onChange, type = 'text', hint }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string; hint?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={s.label}>{label}</label>
      <div style={{ ...s.wrap, borderColor: focused ? '#7c3aed' : '#252525' }}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          style={s.input}
        />
      </div>
      {hint && <p style={{ fontSize: 11, color: '#3d3d3d', marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [form, setForm] = useState({ businessName: '', whatsapp: '', businessType: 'barbershop' })
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      // Already has org → skip onboarding
      if (data.user.user_metadata?.organization_id) { router.push('/appointments'); return }
      setUserId(data.user.id)
      setEmail(data.user.email ?? null)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)

    try {
      const slug = form.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: form.businessName,
          slug,
          whatsappNumber: form.whatsapp,
          email,
          businessType: form.businessType,
        }),
      })

      if (!res.ok) {
        // La respuesta de error puede no ser JSON (ej. página HTML de un 500
        // no manejado) — nunca dejar que eso reviente sin apagar el loading.
        const error = await res.json().catch(() => null)
        toast.error(error?.error ?? 'Error al crear el negocio')
        return
      }

      // Refresh session so new metadata is picked up
      await supabase.auth.refreshSession()
      toast.success('¡Negocio creado!')
      router.push('/payment')
      router.refresh()
    } catch {
      toast.error('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 32, color: '#ffffff' }}>
          <TurnoLogo height={28} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 6 }}>
            Configura tu negocio
          </h1>
          <p style={{ fontSize: 13, color: '#555' }}>Un último paso para activar tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FocusInput
            label="Nombre del negocio"
            placeholder="Barbería El Estilo"
            value={form.businessName}
            onChange={set('businessName')}
          />

          <FocusInput
            label="WhatsApp del negocio"
            placeholder="521XXXXXXXXXX"
            value={form.whatsapp}
            onChange={set('whatsapp')}
            type="tel"
            hint="Formato internacional sin +. Ej: 521XXXXXXXXXX"
          />

          {/* Business type */}
          <div>
            <label style={s.label}>Tipo de negocio</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('businessType')(t.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1.5px solid ${form.businessType === t.value ? '#7c3aed' : '#252525'}`,
                    background: form.businessType === t.value ? '#7c3aed18' : '#141414',
                    color: form.businessType === t.value ? '#c4b5fd' : '#888',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'all .15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !userId}
            style={{ marginTop: 8, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 10, height: 48, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'opacity .15s' }}
          >
            {loading ? <Spinner size={20} color="#fff" /> : 'Entrar al dashboard →'}
          </button>
        </form>
      </div>
    </div>
  )
}
