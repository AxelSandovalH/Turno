import { TESTIMONIALS } from '@/lib/testimonials'

/** Testimonios desde lib/testimonials.ts. Las tarjetas de ejemplo (placeholder) solo se ven en desarrollo. */
export function Testimonials({ t }: { t: { text: string; muted: string; subtle: string; border: string; card: string; accent: string } }) {
  const dev = process.env.NODE_ENV !== 'production'
  const items = TESTIMONIALS.filter(x => dev || !x.placeholder)
  if (items.length === 0) return null
  return (
    <section style={{ borderTop: `1px solid ${t.border}` }}>
      <div className="max-w-5xl mx-auto px-5 py-16 sm:py-24">
        <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Lo que dicen</p>
        <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-10" style={{ color: t.text }}>Negocios que ya contestan solos.</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {items.map((x, i) => (
            <figure key={i} className="rounded-xl p-6" style={{ border: `1px solid ${t.border}`, background: t.card }}>
              {x.placeholder && <p className="text-[11px] font-bold mb-3" style={{ color: '#d97706' }}>EJEMPLO — reemplazar en lib/testimonials.ts</p>}
              <blockquote className="text-[15px] leading-relaxed mb-4" style={{ color: t.text }}>“{x.quote}”</blockquote>
              <figcaption className="text-[13px]" style={{ color: t.muted }}>
                <span className="font-semibold" style={{ color: t.text }}>{x.name}</span> · {x.business} · {x.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
