'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spinner } from '@/components/ui/spinner'

const PLAN = {
  name: 'Agenda + Asistente',
  price: '$1,299',
  regularPrice: '$2,499',
  desc: 'Tu WhatsApp contesta y agenda solo',
  features: ['Contesta WhatsApp 24/7', 'Agenda y reagenda citas por ti', 'Recordatorios automáticos', 'Hasta 5 profesionales', 'Soporte prioritario'],
}

export function PaymentClient() {
  const [loading, setLoading] = useState(false)
  const autoStarted = useRef(false)

  // Viniendo del registro (?auto=1) arranca el checkout solo — un paso menos
  // entre el anuncio y el pago. Si falla, la página queda usable con el botón.
  useEffect(() => {
    if (autoStarted.current) return
    if (new URLSearchParams(window.location.search).get('auto') === '1') {
      autoStarted.current = true
      handleCheckout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-checkout', { method: 'POST' })
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

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ marginBottom: 32, color: '#fff' }}>
          <TurnoLogo height={28} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 4 }}>Activa tu agenda</h1>
          <p style={{ fontSize: 13, color: '#555' }}>Sin contratos · Cancela cuando quieras</p>
        </div>

        {/* Plan card */}
        <div style={{ border: '1.5px solid #7c3aed', background: '#7c3aed12', borderRadius: 12, padding: '20px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#ebebeb' }}>{PLAN.name}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: 99, padding: '2px 8px' }}>Oferta de lanzamiento</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#ebebeb' }}>{PLAN.price}</span>
            <span style={{ fontSize: 12, color: '#555' }}>MXN/mes</span>
            <span style={{ fontSize: 13, color: '#555', textDecoration: 'line-through' }}>{PLAN.regularPrice}</span>
          </div>
          <p style={{ fontSize: 12, color: '#7c3aed', marginTop: 2, marginBottom: 14 }}>Precio especial los primeros 3 meses, luego {PLAN.regularPrice}/mes</p>
          <p style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>{PLAN.desc}</p>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PLAN.features.map(f => (
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
          onClick={handleCheckout}
          disabled={loading}
          style={{ width: '100%', height: 52, background: '#7c3aed', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity .15s' }}
        >
          {loading ? <Spinner size={20} color="#fff" /> : `Activar — ${PLAN.price} MXN/mes por 3 meses →`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3d3d3d', marginTop: 14 }}>
          Pago seguro vía Stripe · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
