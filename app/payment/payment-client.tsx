'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spinner } from '@/components/ui/spinner'

const PLAN = {
  name: 'Agenda + Asistente',
  price: '$2,499',
  desc: 'Tu WhatsApp contesta y agenda solo',
  features: ['Contesta WhatsApp 24/7', 'Agenda y reagenda citas por ti', 'Recordatorios automáticos', 'Hasta 5 profesionales', 'Soporte prioritario'],
}

export function PaymentClient() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe-checkout', { method: 'POST' })
    const { url, error } = await res.json()
    if (error || !url) { setLoading(false); return }
    window.location.href = url
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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#ebebeb' }}>{PLAN.name}</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#ebebeb' }}>{PLAN.price}</span>
              <span style={{ fontSize: 12, color: '#555' }}> MXN/mes</span>
            </div>
          </div>
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
          {loading ? <Spinner size={20} color="#fff" /> : `Activar — ${PLAN.price} MXN/mes →`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3d3d3d', marginTop: 14 }}>
          Pago seguro vía Stripe · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
