import type { DemoPlan } from './types'

// La demo de la landing viaja hasta el registro y el asistente de configuración. Se guarda en el navegador
// (no en el servidor) y caduca a los 7 días. Nada de aquí es de confianza: el servidor lo vuelve a validar.
const KEY = 'qt-demo-handoff'
const TTL_MS = 7 * 24 * 3600_000

export interface DemoHandoff { plan: DemoPlan; description: string; savedAt: number }

export function saveDemoHandoff(plan: DemoPlan, description: string) {
  try { localStorage.setItem(KEY, JSON.stringify({ plan, description, savedAt: Date.now() } satisfies DemoHandoff)) } catch { /* sin almacenamiento: se sigue sin demo */ }
}
export function readDemoHandoff(): DemoHandoff | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const h = JSON.parse(raw) as DemoHandoff
    if (!h?.plan?.businessName || Date.now() - h.savedAt > TTL_MS) { localStorage.removeItem(KEY); return null }
    return h
  } catch { return null }
}
export function clearDemoHandoff() { try { localStorage.removeItem(KEY) } catch { /* nada */ } }
