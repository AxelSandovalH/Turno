import { CheckCircle2 } from 'lucide-react'

export default function DepositSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#10b98122', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={28} color="#10b981" />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#ebebeb', marginBottom: 8 }}>¡Anticipo recibido!</h1>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          Tu cita quedó confirmada. Recibirás un mensaje de WhatsApp con los detalles. Ya puedes cerrar esta ventana.
        </p>
      </div>
    </div>
  )
}
