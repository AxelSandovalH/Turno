import Link from 'next/link'
import { SITE } from '@/lib/site'

/** Contenedor sencillo y legible para las páginas legales (aviso de privacidad y términos). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main style={{ background: '#fff', color: '#1a1a1a', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px', lineHeight: 1.65, fontSize: 15 }}>
        <Link href="/" style={{ fontSize: 14, color: '#6d28d9', textDecoration: 'none' }}>← {SITE.brand}</Link>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '20px 0 4px', letterSpacing: '-0.02em' }}>{title}</h1>
        <p style={{ color: '#6b6b6b', fontSize: 13, marginBottom: 28 }}>Última actualización: {updated}</p>
        {children}
      </div>
    </main>
  )
}

export const H2 = ({ children }: { children: React.ReactNode }) => <h2 style={{ fontSize: 19, fontWeight: 700, margin: '28px 0 8px' }}>{children}</h2>
export const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: '0 0 12px' }}>{children}</p>
export const UL = ({ children }: { children: React.ReactNode }) => <ul style={{ margin: '0 0 12px', paddingLeft: 22 }}>{children}</ul>

/** Medio de contacto: el correo si está definido; si no, WhatsApp. */
export function contactText(): string {
  return SITE.contactEmail ? `${SITE.contactEmail} o por WhatsApp al ${SITE.whatsappDisplay}` : `WhatsApp al ${SITE.whatsappDisplay}`
}
