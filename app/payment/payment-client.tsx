'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spinner } from '@/components/ui/spinner'
import { PLANS, DEFAULT_PLAN, PREPAID_MONTHS, isPlanKey, planKeyFor, type PlanKey, type PrepaidMonths } from '@/lib/plans'
import { PlanComposer } from '@/components/pricing/plan-composer'


export function PaymentClient({ trial = false }: { trial?: boolean }) {
  const [selected, setSelected] = useState<PlanKey>(DEFAULT_PLAN)
  const [loading, setLoading] = useState(false)
  const autoStarted = useRef(false)
  const [months, setMonths] = useState<PrepaidMonths>(1)

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

  async function handleCheckout(planKey: PlanKey = selected, prepaid = false) {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepaid ? { planKey, mode: 'prepaid', months } : { planKey }),
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

        {/* Plan armado con piezas: base + asistente */}
        <div style={{ marginBottom: 20 }}>
          <PlanComposer
            segment={PLANS[selected].segment}
            assistant={PLANS[selected].bot}
            onToggle={() => setSelected(k => planKeyFor(PLANS[k].segment, !PLANS[k].bot))}
          />
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
          {loading ? <Spinner size={20} color="#fff" /> : trial ? 'Empezar 7 días gratis →' : `Activar ${plan.name.replace('Turno — ', '')} — ${plan.priceLabel} MXN/mes →`}
        </button>

        {/* Prepago: OXXO o transferencia SPEI (no permiten cobro automático mensual) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
          <span style={{ fontSize: 11, color: '#444' }}>¿Prefieres pagar en efectivo o por transferencia?</span>
          <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
        </div>
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {PREPAID_MONTHS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${months === m ? '#7c3aed' : '#252525'}`, background: months === m ? '#7c3aed18' : '#141414', color: months === m ? '#c4b5fd' : '#888' }}
              >
                {m} {m === 1 ? 'mes' : 'meses'} · ${(plan.amount * m / 100).toLocaleString('es-MX')}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleCheckout(selected, true)}
            disabled={loading}
            style={{ width: '100%', height: 46, background: 'transparent', border: '1.5px solid #333', borderRadius: 10, color: '#ebebeb', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            Pagar en OXXO o por transferencia SPEI
          </button>
          <p style={{ fontSize: 11, color: '#4a4a4a', marginTop: 10, lineHeight: 1.5, textAlign: 'center' }}>
            Pago por adelantado, sin renovación automática. Tu cuenta se activa al confirmarse el pago y te avisamos antes de que venza.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3d3d3d', marginTop: 14 }}>
          {trial ? `Hoy no se te cobra. Después de 7 días: ${plan.priceLabel} MXN al mes. Cancela antes y no pagas.` : 'Pago seguro vía Stripe · Cancela cuando quieras'}
        </p>
      </div>
    </div>
  )
}
