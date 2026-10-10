import Link from 'next/link'
import { Clock } from 'lucide-react'
import { TurnoLogo } from '@/components/ui/turno-logo'

export const metadata = { title: 'Pago pendiente · QuickTurno' }

// Destino después de generar la referencia de OXXO o de transferencia SPEI
export default function PendingPaymentPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center', color: '#fff' }}><TurnoLogo height={24} /></div>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Clock size={28} color="#7c3aed" />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#ebebeb', marginBottom: 8, letterSpacing: '-0.02em' }}>Estamos esperando tu pago</h1>
        <p style={{ fontSize: 13, color: '#777', lineHeight: 1.7, marginBottom: 24 }}>
          Ya generamos tu referencia. Págala en OXXO o haz la transferencia SPEI con los datos que te mostró Stripe.
          Tu cuenta se activa sola en cuanto el pago se confirme: en OXXO puede tardar unas horas, y la transferencia suele ser casi inmediata.
        </p>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 28 }}>
          Te llegará un correo con la referencia. La referencia de OXXO vence en 3 días.
        </p>
        <Link href="/appointments" style={{ display: 'block', padding: '14px 0', background: '#7c3aed', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Revisar el estado de mi cuenta
        </Link>
        <p style={{ fontSize: 11, color: '#333', marginTop: 14 }}>
          ¿Necesitas ayuda? <a href="mailto:equipo@quickturno.app" style={{ color: '#555', textDecoration: 'underline' }}>equipo@quickturno.app</a>
        </p>
      </div>
    </div>
  )
}
