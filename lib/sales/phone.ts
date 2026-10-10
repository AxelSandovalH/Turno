/** Teléfono mexicano en el formato que usa WhatsApp aquí: 521 + 10 dígitos. Null si no es válido. */
export function normalizeMxPhone(raw: string): string | null {
  const d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 10) return `521${d}`
  if (d.length === 12 && d.startsWith('52')) return `521${d.slice(2)}`
  if (d.length === 13 && d.startsWith('521')) return d
  return null
}

/** Últimos 10 dígitos: sirve para reconocer al mismo número escrito de distintas formas. */
export const phoneKey = (p: string) => String(p ?? '').replace(/\D/g, '').slice(-10)

/** Mensajes con los que una persona pide que no le escriban más. */
const OPT_OUT = [
  /^\s*(no|nel|nop|stop|baja|alto|ya no|basta)\s*[.!]*\s*$/i,
  /\bno\s+(me\s+)?(escrib|molest|mand|vuelv|contact|llam)\w*/i,
  /\b(dej(en|a|ar)\s+de\s+(escrib|mand|molest|contact)\w*)/i,
  /\bya\s+no\s+(quiero|me\s+interesa|me\s+escrib)\w*/i,
  /\b(quít|quit|elimin|bórr|borr)\w*\s+(me|mi\s+n[uú]mero|mi\s+contacto|de\s+(su|la)\s+lista)/i,
  /\b(spam|acoso|denunci|profeco|bloque)\w*/i,
  /\bno\s+gracias\b/i,
]
export function isOptOut(text: string): boolean {
  const t = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const raw = text.toLowerCase()
  return OPT_OUT.some(re => re.test(raw) || re.test(t))
}

/** Giros que se aceptan al cargar prospectos -> business_type de QuickTurno. */
export function segmentFromText(raw: string): string {
  const t = String(raw ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/tour|actividad|snorkel|excurs/.test(t)) return 'tours'
  if (/restaur|taquer|cafe|comida|pizz|sushi|alitas|lonche/.test(t)) return 'restaurant'
  if (/barber|estetic|peluq|salon/.test(t)) return 'barbershop'
  if (/spa|masaj|bienestar|facial|uñas|unas|belleza/.test(t)) return 'spa'
  if (/psicolog|terap/.test(t)) return 'psychology'
  if (/dent|odont/.test(t)) return 'dentistry'
  if (/fisio|rehab/.test(t)) return 'physiotherapy'
  if (/charter|yate|pesca|embarc|lancha|velero/.test(t)) return 'charter'
  if (/tatu|tattoo|piercing/.test(t)) return 'tattoo'
  if (/laborat/.test(t)) return 'laboratory'
  if (/consult|abogad|contador|asesor/.test(t)) return 'consulting'
  return 'other'
}
