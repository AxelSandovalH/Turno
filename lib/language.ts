import type { SupabaseClient } from '@supabase/supabase-js'

export type Lang = 'es' | 'en'

const EN = new Set(['the', 'and', 'you', 'your', 'i', 'am', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'my', 'me', 'we', 'it', 'this', 'that', 'what', 'how', 'can', 'could', 'would', 'do', 'does', 'have', 'has', 'need', 'want', 'please', 'thanks', 'thank', 'hello', 'hi', 'hey', 'yes', 'ok', 'okay', 'price', 'much', 'when', 'where', 'there', 'available', 'tomorrow', 'today', 'tonight', 'book', 'appointment', 'which', 'if', 'not', 'but', 'about', 'just', 'looking', 'going', 'will', 'hola', 'good', 'morning', 'afternoon', 'evening'].filter(w => w !== 'hola'))
const ES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'que', 'y', 'en', 'es', 'por', 'para', 'con', 'mi', 'me', 'te', 'se', 'lo', 'su', 'al', 'hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'gracias', 'quiero', 'necesito', 'cuanto', 'cuesta', 'precio', 'cita', 'mañana', 'hoy', 'si', 'no', 'pero', 'como', 'cual', 'tienen', 'tengo', 'puedo', 'favor', 'saludos', 'donde', 'cuando', 'estoy', 'soy', 'muy', 'más', 'mas'])

/** Idioma de una lista de mensajes del cliente: inglés solo si domina con claridad; ante la duda, español. */
export function detectLanguage(texts: string[]): Lang {
  let en = 0, es = 0
  for (const t of texts) {
    const lower = t.toLowerCase()
    if (/[¿¡ñáéíóú]/.test(lower)) es += 2
    for (const w of lower.split(/[^a-záéíóúñü']+/)) {
      if (!w) continue
      if (EN.has(w)) en++
      if (ES.has(w)) es++
    }
  }
  return en >= 2 && en > es ? 'en' : 'es'
}

/** Idioma en que el cliente escribe con el bot, según sus últimos mensajes en la conversación de WhatsApp. */
export async function conversationLanguage(db: SupabaseClient, organizationId: string, phone: string | null | undefined): Promise<Lang> {
  const digits = String(phone ?? '').replace(/\D/g, '').slice(-10)
  if (digits.length < 10) return 'es'
  try {
    const { data: convo } = await db.from('conversations').select('id').eq('organization_id', organizationId).like('whatsapp_phone', `%${digits}%`).order('last_message_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    if (!convo) return 'es'
    const { data: msgs } = await db.from('messages').select('content').eq('conversation_id', convo.id).eq('role', 'user').order('created_at', { ascending: false }).limit(6)
    return detectLanguage((msgs ?? []).map(m => String(m.content ?? '')))
  } catch { return 'es' }
}
