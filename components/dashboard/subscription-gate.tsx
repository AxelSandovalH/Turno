'use client'

import Link from 'next/link'
import { AlertTriangle, Sparkles, XCircle } from 'lucide-react'
import { TurnoLogo } from '@/components/ui/turno-logo'

type SubscriptionStatus = 'trialing' | 'active' | 'suspended' | 'canceled' | 'past_due'

interface Props {
  status: SubscriptionStatus
  children: React.ReactNode
}

function GateScreen({ icon, title, description, cta }: {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
}) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0c0c0c',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-geist-sans)',
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <TurnoLogo height={24} />
        </div>

        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          {icon}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#ebebeb', marginBottom: 8, letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 28 }}>
          {description}
        </p>

        <Link
          href="/payment"
          style={{
            display: 'block', width: '100%', padding: '14px 0',
            background: '#7c3aed', borderRadius: 12, color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            transition: 'opacity .15s',
          }}
        >
          {cta}
        </Link>

        <p style={{ fontSize: 11, color: '#333', marginTop: 12 }}>
          ¿Necesitas ayuda?{' '}
          <a href="https://wa.me/523141222146" style={{ color: '#555', textDecoration: 'underline' }}>
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  )
}

export function SubscriptionGate({ status, children }: Props) {
  // Sin trials: 'trialing' (default post-onboarding) significa que aún no paga
  if (status === 'trialing') {
    return (
      <GateScreen
        icon={<Sparkles size={28} color="#7c3aed" />}
        title="Ya casi está listo"
        description="Tu cuenta está creada. Elige un plan para activar tu agenda y que tu WhatsApp empiece a contestar solo."
        cta="Elegir mi plan →"
      />
    )
  }

  if (status === 'suspended') {
    return (
      <GateScreen
        icon={<AlertTriangle size={28} color="#ef4444" />}
        title="Cuenta suspendida"
        description="Hubo un problema con tu último pago. Reactiva tu suscripción para recuperar el acceso y que tu bot vuelva a funcionar."
        cta="Reactivar suscripción →"
      />
    )
  }

  if (status === 'canceled') {
    return (
      <GateScreen
        icon={<XCircle size={28} color="#6b7280" />}
        title="Suscripción cancelada"
        description="Tu suscripción fue cancelada. Puedes reactivarla en cualquier momento para volver a usar Turno."
        cta="Reactivar →"
      />
    )
  }

  return <>{children}</>
}
