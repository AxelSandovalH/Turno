import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }

/** Imagen para compartir el sitio (WhatsApp, redes, y herramientas que leen la página como producto). */
export function renderOgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0a0a0a 0%, #1f1147 100%)', color: 'white', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'white', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800 }}>QT</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>QuickTurno</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, display: 'flex' }}>Tu WhatsApp contesta y agenda solo.</div>
          <div style={{ fontSize: 34, color: '#c4b5fd', display: 'flex' }}>Citas, pedidos, recordatorios y cobros por WhatsApp, 24 horas.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#e5e7eb' }}>7 días gratis · Desde $700 MXN/mes · quickturno.app</div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
