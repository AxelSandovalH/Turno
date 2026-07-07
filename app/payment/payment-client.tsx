'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spinner } from '@/components/ui/spinner'

interface Plan {
  key: string
  name: string
  price: string
  priceNum: number
  desc: string
  features: string[]
  highlight: boolean
}

const PLANS: Plan[] = [
  {
    key: 'landing',
    name: 'Página web',
    price: '$899',
    priceNum: 899,
    desc: 'Para que te encuentren en internet',
    features: ['Tu página profesional', 'Botón directo a tu WhatsApp', 'Aparece en Google', 'Dominio incluido 1 año'],
    highlight: false,
  },
  {
    key: 'turno-sys',
    name: 'Agenda',
    price: '$1,299',
    priceNum: 1299,
    desc: 'Tus citas ordenadas, tú las agendas',
    features: ['Calendario de citas', 'Hasta 5 profesionales', 'Recordatorios por WhatsApp', 'Citas ilimitadas'],
    highlight: false,
  },
  {
    key: 'turno-ai',
    name: 'Agenda + Asistente',
    price: '$2,799',
    priceNum: 2799,
    desc: 'Tu WhatsApp contesta y agenda solo',
    features: ['Todo lo de Agenda', 'Contesta WhatsApp 24/7', 'Agenda las citas por ti', 'Soporte prioritario'],
    highlight: true,
  },
  {
    key: 'bundle-sys',
    name: 'Página web + Agenda',
    price: '$1,799',
    priceNum: 1799,
    desc: 'Ahorra $399/mes',
    features: ['Tu página profesional', 'Calendario de citas', 'Hasta 5 profesionales', 'Recordatorios por WhatsApp'],
    highlight: false,
  },
  {
    key: 'bundle-ai',
    name: 'Página web + Asistente',
    price: '$3,299',
    priceNum: 3299,
    desc: 'Ahorra $499/mes',
    features: ['Tu página profesional', 'Contesta WhatsApp 24/7', 'Agenda las citas por ti', 'Soporte prioritario'],
    highlight: false,
  },
]

export function PaymentClient() {
  const [selected, setSelected] = useState('turno-ai')
  const [loading, setLoading] = useState(false)

  const plan = PLANS.find(p => p.key === selected)!

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planKey: selected }),
    })
    const { url, error } = await res.json()
    if (error || !url) { setLoading(false); return }
    window.location.href = url
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        <div style={{ marginBottom: 32, color: '#fff' }}>
          <TurnoLogo height={28} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.03em', marginBottom: 4 }}>Elige tu plan</h1>
          <p style={{ fontSize: 13, color: '#555' }}>Sin contratos · Cancela cuando quieras</p>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {PLANS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelected(p.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${selected === p.key ? '#7c3aed' : '#1f1f1f'}`,
                background: selected === p.key ? '#7c3aed12' : '#111',
                textAlign: 'left', width: '100%', fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >
              {/* Radio */}
              <div style={{
                width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                border: `2px solid ${selected === p.key ? '#7c3aed' : '#333'}`,
                background: selected === p.key ? '#7c3aed' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected === p.key && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#fff' }} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#ebebeb' }}>{p.name}</span>
                  {p.highlight && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: 99, padding: '1px 7px' }}>Popular</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: '#555' }}>{p.desc}</span>
              </div>

              {/* Price */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#ebebeb' }}>{p.price}</span>
                <span style={{ fontSize: 11, color: '#555' }}> MXN/mes</span>
              </div>
            </button>
          ))}
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
          onClick={handleCheckout}
          disabled={loading}
          style={{ width: '100%', height: 52, background: '#7c3aed', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity .15s' }}
        >
          {loading ? <Spinner size={20} color="#fff" /> : `Activar ${plan.name} — ${plan.price} MXN/mes →`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#3d3d3d', marginTop: 14 }}>
          Pago seguro vía Stripe · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
