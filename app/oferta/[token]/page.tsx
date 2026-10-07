import type { Metadata } from 'next'
import Link from 'next/link'
import { PLANS } from '@/lib/plans'
import { OFFER_PERCENT_OFF, verifyOfferToken } from '@/lib/offer'
import { Countdown } from './countdown'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Oferta QuickTurno', robots: { index: false } }

const money = (centavos: number) => `$${(centavos / 100).toLocaleString('es-MX')}`

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const check = verifyOfferToken(token)

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>{children}</div>
    </div>
  )

  if (!check.valid) {
    return shell(
      <>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#ebebeb', marginBottom: 10 }}>
          {check.reason === 'expired' ? 'Esta oferta ya terminó' : 'Enlace no válido'}
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
          {check.reason === 'expired'
            ? 'La oferta era válida por 24 horas. Escríbenos y vemos qué podemos hacer.'
            : 'Revisa que el enlace esté completo o pídenos uno nuevo.'}
        </p>
        <Link href="/" style={{ color: '#a78bfa', fontSize: 14 }}>Conocer QuickTurno</Link>
      </>
    )
  }

  const plan = PLANS[check.plan]
  const discounted = Math.round(plan.amount * (100 - OFFER_PERCENT_OFF) / 100)

  return shell(
    <>
      <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#a78bfa', background: '#a78bfa1a', padding: '6px 14px', borderRadius: 999, marginBottom: 18 }}>
        {OFFER_PERCENT_OFF}% de descuento en tu primer mes
      </span>
      <h1 style={{ fontSize: 28, fontWeight: 600, color: '#ebebeb', letterSpacing: '-0.02em', marginBottom: 8 }}>{plan.name.replace('Turno — ', '')}</h1>
      <p style={{ fontSize: 14, color: '#777', marginBottom: 26 }}>{plan.description}</p>

      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 18, color: '#555', textDecoration: 'line-through', marginRight: 10 }}>{money(plan.amount)}</span>
        <span style={{ fontSize: 44, fontWeight: 700, color: '#ebebeb', letterSpacing: '-0.03em' }}>{money(discounted)}</span>
        <span style={{ fontSize: 14, color: '#777' }}> MXN</span>
      </div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 28 }}>El primer mes. Después {money(plan.amount)} MXN al mes, sin contratos ni permanencia.</p>

      <p style={{ fontSize: 12, color: '#777', marginBottom: 10 }}>La oferta termina en</p>
      <div style={{ marginBottom: 30 }}><Countdown expiresAt={check.expiresAt} /></div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', textAlign: 'left', display: 'inline-block' }}>
        {plan.features.map(f => (
          <li key={f} style={{ fontSize: 14, color: '#bbb', padding: '5px 0' }}>
            <span style={{ color: '#10b981', marginRight: 10 }}>✓</span>{f}
          </li>
        ))}
      </ul>

      <a href={`/oferta/${token}/comprar`} style={{ display: 'block', background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 16, padding: '16px 0', borderRadius: 14, textDecoration: 'none' }}>
        Aprovechar oferta
      </a>
    </>
  )
}
