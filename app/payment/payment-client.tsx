'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spinner } from '@/components/ui/spinner'
import { PLANS, DEFAULT_PLAN, isPlanKey, type PlanKey } from '@/lib/plans'

const PLAN_LIST = [PLANS.agenda, PLANS.asistente]

export function PaymentClient() {
  const [selected, setSelected] = useState<PlanKey>(DEFAULT_PLAN)
  const [loading, setLoading] = useState(false)
  const autoStarted = useRef(false)

  // Si el plan ya se eligió antes (landing/registro: ?plan=agenda|asistente)
  // se preselecciona; y con ?auto=1 arranca el checkout sin un clic más.
  // Sin plan explícito nunca se auto-arranca: el usuario debe escoger.
  useEffect(() => {
    if (autoStarted.current) return
    const params = new URLSearchParams(window.location.search)
    const plan = params.get('plan')
    if (isPlanKey(plan)) {
      setSelected(plan)
      if (params.get('auto') === '1') {
        autoStarted.current = true
        handleCheckout(plan)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCheckout(planKey: PlanKey = selected) {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      })
      // La respuesta puede no ser JSON (ej. página de error HTML de un 500
      // no manejado) — nunca dejar que eso reviente sin apagar el loading.
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) {
        toast.error(data?.error ?? 'No se pudo iniciar el pago. Intenta de nuevo.')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const plan = PLANS[selected]

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ marginBottom: 32, color: '#fff' }}>
          <TurnoLogo height={28} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 4 }}>Elige tu plan</h1>
          <p style={{ fontSize: 13, color: '#555' }}>Sin contratos · Cancela cuando quieras</p>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {PLAN_LIST.map(p => {
            const active = selected === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelected(p.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${active ? '#7c3aed' : '#1f1f1f'}`,
                  background: active ? '#7c3aed12' : '#111',
                  textAlign: 'left', width: '100%', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                  border: `2px solid ${active ? '#7c3aed' : '#333'}`,
                  background: active ? '#7c3aed' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#fff' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#ebebeb' }}>{p.name.replace('Turno — ', '')}</span>
                    {p.bot && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: 99, padding: '1px 7px' }}>Popular</span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#555' }}>{p.description}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#ebebeb' }}>{p.priceLabel}</span>
                  <span style={{ fontSize: 11, color: '#555' }}> MXN/mes</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Features del plan seleccionado */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Incluye</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.features.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: 99, background: '#7c3aed22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={10} color="#7c3aed" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, color: '#aaa' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => handleCheckout()}
          disabled={loading}
          style={{ width: '100%', height: 52, background: '#7c3aed', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity .15s' }}
        >
          {loading ? <Spinner size={20} color="#fff" /> : `Activar ${plan.name.replace('Turno — ', '')} — ${plan.priceLabel} MXN/mes →`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3d3d3d', marginTop: 14 }}>
          Pago seguro vía Stripe · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
