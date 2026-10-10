// Lo que la demo deja sembrado en la cuenta nueva. Llega del navegador, así que se vuelve a validar y acotar aquí.
export interface DemoSeed {
  accent: string | null
  services: { name: string; description: string; price: number; duration: number }[]
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
}

export function sanitizeDemoSeed(raw: unknown): DemoSeed | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const accent = /^#[0-9a-fA-F]{6}$/.test(str(r.accent, 7)) ? str(r.accent, 7) : null
  const services = (Array.isArray(r.services) ? r.services.slice(0, 30) : []).flatMap((s: unknown) => {
    const o = (s ?? {}) as Record<string, unknown>
    const name = str(o.name, 60)
    if (!name) return []
    return [{ name, description: str(o.description, 160), price: num(o.price, 0, 50000, 0), duration: num(o.durationMin, 5, 600, 30) }]
  }).slice(0, 6)
  return accent || services.length ? { accent, services } : null
}
