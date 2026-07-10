import { XCircle } from 'lucide-react'

export default function DepositCancelledPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#6b728022', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <XCircle size={28} color="#9ca3af" />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#ebebeb', marginBottom: 8 }}>Pago no completado</h1>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          Tu horario se liberará si no completas el pago del anticipo a tiempo. Puedes volver a WhatsApp para intentarlo de nuevo.
        </p>
      </div>
    </div>
  )
}
