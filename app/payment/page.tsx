'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spinner } from '@/components/ui/spinner'

const FEATURES = [
  'Bot de WhatsApp con IA 24/7',
  'Dashboard de citas y clientes',
  'Recordatorios automáticos',
  'Múltiples profesionales',
  'Soporte prioritario',
]

export default function PaymentPage() {
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

        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, padding: 32 }}>
          {/* Plan */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Turno AI</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: 99, padding: '2px 8px' }}>Popular</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 700, color: '#ebebeb', letterSpacing: '-0.03em' }}>$2,799</span>
              <span style={{ fontSize: 14, color: '#555' }}>MXN / mes</span>
            </div>
            <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Tu asistente de WhatsApp activo desde hoy</p>
          </div>

          {/* Features */}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: 99, background: '#7c3aed22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={11} color="#7c3aed" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 13, color: '#aaa' }}>{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{ width: '100%', height: 52, background: '#7c3aed', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity .15s' }}
          >
            {loading ? <Spinner size={20} color="#fff" /> : 'Activar mi cuenta →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#3d3d3d', marginTop: 14 }}>
            Pago seguro vía Stripe · Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  )
}
