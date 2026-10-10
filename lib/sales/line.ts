import { createServiceClient } from '@/lib/supabase/service'
import { instanceAction, configureInstanceWebhook } from '@/lib/ultramsg'
import { WEBHOOK_URL } from '@/lib/whatsapp-connection'

// La línea de ventas es una instancia apartada (reserved_for = 'sales'). Estas funciones la mueven sin
// dejar nunca una instancia compartida entre ventas y un negocio, ni "libre" mientras ventas la usa.

export type LineResult = { ok: true } | { ok: false; error: string }

/** Suelta la línea de ventas anterior: cierra su sesión y la devuelve a la reserva libre. */
async function releaseOldLine(newInstance: string | null) {
  const db = createServiceClient()
  const { data: cfg } = await db.from('sales_config').select('ultramsg_instance, ultramsg_token').eq('id', 1).single()
  if (!cfg?.ultramsg_instance || cfg.ultramsg_instance === newInstance) return
  await instanceAction({ instance: cfg.ultramsg_instance, token: cfg.ultramsg_token }, 'logout')
    .catch(err => console.error('[sales] no se pudo cerrar la sesión de la línea anterior:', err))
  await db.from('whatsapp_instances').update({ reserved_for: null }).eq('instance_id', cfg.ultramsg_instance)
}

async function setLine(instance: string, token: string) {
  const db = createServiceClient()
  await releaseOldLine(instance)
  await db.from('whatsapp_instances').upsert(
    { instance_id: instance, token, organization_id: null, assigned_at: null, reserved_for: 'sales' },
    { onConflict: 'instance_id' }
  )
  await db.from('sales_config').update({ ultramsg_instance: instance, ultramsg_token: token, updated_at: new Date().toISOString() }).eq('id', 1)
  // Una instancia recién sacada de la reserva puede no apuntar todavía al webhook de QuickTurno
  await configureInstanceWebhook({ instance, token }, WEBHOOK_URL).catch(err => console.error('[sales] no se pudo configurar el webhook:', err))
}

/** Aparta para ventas una instancia libre de la reserva. */
export async function reserveFreeInstance(instanceId: string): Promise<LineResult> {
  const db = createServiceClient()
  const { data: row } = await db.from('whatsapp_instances').select('instance_id, token, organization_id, reserved_for').eq('instance_id', instanceId).maybeSingle()
  if (!row) return { ok: false, error: 'Esa instancia no está en la reserva' }
  if (row.organization_id) return { ok: false, error: 'Esa instancia está asignada a un negocio' }
  if (row.reserved_for && row.reserved_for !== 'sales') return { ok: false, error: 'Esa instancia está apartada para otra cosa' }
  await setLine(row.instance_id, row.token)
  return { ok: true }
}

/**
 * Mueve la instancia de un negocio a ventas. La sesión de WhatsApp NO se cierra (el número sigue
 * conectado); el negocio se queda sin línea y, si tiene el asistente, recibirá otra de la reserva
 * cuando abra su pantalla de WhatsApp.
 */
export async function moveInstanceFromOrg(slug: string): Promise<LineResult> {
  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('id, name, ultramsg_instance, ultramsg_token').eq('slug', slug).maybeSingle()
  if (!org?.ultramsg_instance || !org?.ultramsg_token) return { ok: false, error: 'Ese negocio no tiene una instancia de WhatsApp' }
  const { id, ultramsg_instance: instance, ultramsg_token: token } = org
  await db.from('organizations').update({ ultramsg_instance: null, ultramsg_token: null, whatsapp_connected_at: null }).eq('id', id)
  await setLine(instance, token)
  return { ok: true }
}

/** Quita la línea de ventas: apaga el agente, cierra la sesión y devuelve la instancia a la reserva. */
export async function clearLine(): Promise<LineResult> {
  const db = createServiceClient()
  await releaseOldLine(null)
  await db.from('sales_config').update({ enabled: false, ultramsg_instance: null, ultramsg_token: null, updated_at: new Date().toISOString() }).eq('id', 1)
  return { ok: true }
}
