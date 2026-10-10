import { ALL_PROFILES } from '@/lib/profiles/registry'
import { availableTags, heroPhoto, servicePhoto } from './photos'
import type { DemoPlan } from './types'

export const SEGMENTS = ALL_PROFILES.map(p => p.type)

export const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : fallback)
export const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
}
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** Convierte lo que devuelve la IA (o lo que manda el navegador) en un plan seguro: todo acotado y validado. null si queda incompleto. */
export function normalizePlan(raw: Record<string, unknown>): DemoPlan | null {
  const segment = SEGMENTS.includes(str(raw.segment, 30) as never) ? str(raw.segment, 30) : 'other'
  const tags = availableTags()[segment] ?? []
  const services = arr<Record<string, unknown>>(raw.services).slice(0, 6).map((s, i) => {
    const tag = tags.includes(str(s.photoTag, 40)) ? str(s.photoTag, 40) : null
    return {
      name: str(s.name, 60, 'Servicio'), description: str(s.description, 100),
      price: num(s.price, 0, 50000, 0), durationMin: num(s.durationMin, 0, 600, 0),
      photoTag: tag, photo: servicePhoto(segment, tag ?? undefined, i),
    }
  })
  if (services.length < 2) return null
  return {
    businessName: str(raw.businessName, 60, 'Tu negocio'), tagline: str(raw.tagline, 80),
    segment, accent: /^#[0-9a-fA-F]{6}$/.test(str(raw.accent, 7)) ? str(raw.accent, 7) : '#7c3aed',
    staffLabel: str(raw.staffLabel, 24, 'Equipo'), staff: arr<unknown>(raw.staff).slice(0, 3).map(n => str(n, 30)).filter(Boolean),
    services,
    agenda: arr<Record<string, unknown>>(raw.agenda).slice(0, 6).map(a => ({ time: str(a.time, 5), service: str(a.service, 60), client: str(a.client, 30), staff: str(a.staff, 30) })),
    chat: arr<Record<string, unknown>>(raw.chat).slice(0, 8).map(m => ({ from: m.from === 'bot' ? 'bot' as const : 'customer' as const, text: str(m.text, 420), time: str(m.time, 5) })),
    heroPhoto: heroPhoto(segment, services.length),
  }
}
