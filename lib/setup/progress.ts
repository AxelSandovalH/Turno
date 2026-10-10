import type { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'

export interface SetupStep { id: string; label: string; detail: string; done: boolean; href: string }
export interface SetupProgress { steps: SetupStep[]; done: number; total: number }

type Db = ReturnType<typeof createServiceClient>

/** Qué le falta a un negocio para estar listo: lo que mide el avance del asistente y el aviso del panel. */
export async function getSetupProgress(db: Db, orgId: string): Promise<SetupProgress> {
  const { data: org } = await db.from('organizations')
    .select('business_type, address, welcome_message, logo_url, whatsapp_bot_enabled, whatsapp_connected_at').eq('id', orgId).single()
  if (!org) return { steps: [], done: 0, total: 0 }
  const count = (t: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const q = db.from(t).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
    return (f ? f(q) : q).then((r: { count: number | null }) => r.count ?? 0)
  }
  const agenda = hasCapability(org.business_type, 'appointments')
  const steps: SetupStep[] = []

  if (agenda) {
    const [active, drafts, schedules] = await Promise.all([
      count('services', q => q.eq('is_active', true)), count('services', q => q.eq('is_active', false)), count('staff_schedules'),
    ])
    steps.push({ id: 'services', label: 'Servicios publicados', done: active > 0, href: '/services',
      detail: active > 0 ? `${active} en tu página${drafts ? ` · ${drafts} en borrador` : ''}` : drafts ? `${drafts} en borrador por confirmar` : 'Aún no tienes' })
    steps.push({ id: 'schedule', label: 'Horarios', done: schedules > 0, href: '/schedule', detail: schedules > 0 ? 'Definidos' : 'Sin definir' })
  } else {
    const items = await count('menu_items')
    steps.push({ id: 'menu', label: 'Menú con platillos', done: items > 0, href: '/menu', detail: items > 0 ? `${items} platillos` : 'Aún vacío' })
  }
  steps.push({ id: 'profile', label: 'Datos del negocio', done: !!(org.address || org.welcome_message), href: '/settings', detail: org.address || org.welcome_message ? 'Completos' : 'Falta dirección y mensajes' })
  steps.push({ id: 'logo', label: 'Logo y marca', done: !!org.logo_url, href: '/settings', detail: org.logo_url ? 'Cargado' : 'Sube tu logo' })
  if (org.whatsapp_bot_enabled) steps.push({ id: 'whatsapp', label: 'WhatsApp conectado', done: !!org.whatsapp_connected_at, href: '/whatsapp', detail: org.whatsapp_connected_at ? 'Conectado' : 'Escanea el QR' })

  return { steps, done: steps.filter(s => s.done).length, total: steps.length }
}
