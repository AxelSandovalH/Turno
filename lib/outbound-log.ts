import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'

/** Huella estable de un texto: ignora mayúsculas de espacios y saltos de línea. */
export const bodyHash = (body: string) => createHash('sha1').update(String(body ?? '').replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 20)
const inst = (i: string) => String(i ?? '').replace(/^instance/i, '')
const digits = (p: string) => String(p ?? '').replace(/\D/g, '').slice(-10)

/** Anota lo que el sistema va a enviar (antes de enviarlo): así, cuando WhatsApp avise que "salió un mensaje", sabemos que fue nuestro. */
export async function logOutbound(instance: string, to: string, body: string) {
  try {
    await createServiceClient().from('outbound_log').insert({ instance: inst(instance), to_phone: digits(to), body_hash: bodyHash(body) })
  } catch (err) {
    console.error('[outbound-log] no se pudo anotar', err)
  }
}

/** ¿El sistema envió este mismo texto a este número en los últimos minutos? */
export async function wasSentBySystem(instance: string, to: string, body: string, minutes = 15): Promise<boolean> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  const { data } = await createServiceClient().from('outbound_log').select('id').eq('instance', inst(instance)).eq('to_phone', digits(to)).eq('body_hash', bodyHash(body)).gte('created_at', since).limit(1)
  return !!data?.length
}
