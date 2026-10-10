import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import type { Organization } from '@/types/database'

export interface SetupStep {
  id: string
  title: string
  desc: string
  /** Módulo donde se completa; sin href es un paso informativo */
  href?: string
  cta?: string
  done: boolean
}

export interface SetupInfo {
  steps: SetupStep[]
  /** Link público del negocio (reservas o pedidos) para el último paso */
  shareUrl: string | null
}

/**
 * Pasos para dejar un negocio nuevo funcionando. Se calculan con los datos reales:
 * un paso queda marcado solo cuando de verdad ya está hecho.
 * Devuelve lista vacía para giros sin guía (ej. laboratorio).
 */
export async function getSetupSteps(org: Organization): Promise<SetupInfo> {
  const db = createServiceClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
  const isOrders = hasCapability(org.business_type, 'orders')
  const isAppointments = hasCapability(org.business_type, 'appointments') && hasCapability(org.business_type, 'booking-page')
  if (!isOrders && !isAppointments) return { steps: [], shareUrl: null }

  const steps: SetupStep[] = [
    {
      id: 'logo',
      title: 'Sube tu logo',
      desc: 'Aparece en tu panel y en tu página pública.',
      href: '/settings',
      cta: 'Subir logo',
      done: !!org.logo_url,
    },
  ]

  if (isOrders) {
    const { count } = await db.from('menu_items').select('id', { count: 'exact', head: true }).eq('organization_id', org.id)
    steps.push({
      id: 'menu',
      title: 'Agrega tus platillos',
      desc: 'Con foto, precio y extras. Es lo que verán tus clientes.',
      href: '/menu',
      cta: 'Armar menú',
      done: (count ?? 0) > 0,
    })
  } else {
    const [{ count: services }, { data: staff }] = await Promise.all([
      db.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
      db.from('staff').select('id').eq('organization_id', org.id),
    ])
    steps.push({
      id: 'services',
      title: 'Agrega tus servicios',
      desc: 'Nombre, duración y precio de lo que ofreces.',
      href: '/services',
      cta: 'Agregar servicios',
      done: (services ?? 0) > 0,
    })
    const staffIds = (staff ?? []).map(s => s.id)
    let scheduled = 0
    if (staffIds.length) {
      const { count } = await db.from('staff_schedules').select('id', { count: 'exact', head: true }).in('staff_id', staffIds)
      scheduled = count ?? 0
    }
    steps.push({
      id: 'schedule',
      title: 'Define tus horarios',
      desc: 'Los días y horas en que atiendes, para que solo se reserve lo disponible.',
      href: '/schedule',
      cta: 'Configurar horarios',
      done: scheduled > 0,
    })
  }

  // El bot solo existe en los planes que lo incluyen
  if (org.whatsapp_bot_enabled) {
    steps.push({
      id: 'whatsapp',
      title: 'Conecta tu WhatsApp',
      desc: org.ultramsg_instance
        ? 'Tu número ya está conectado al asistente.'
        : 'Nuestro equipo conecta tu número al asistente. Si aún no te contactan, escríbenos.',
      done: !!org.ultramsg_instance,
    })
  }

  return { steps, shareUrl: `${baseUrl}/${isOrders ? 'pedir' : 'book'}/${org.slug}` }
}
