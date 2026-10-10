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

/** Frases típicas de los mensajes automáticos de WhatsApp Business (bienvenida, ausencia, horario). */
const AUTO_REPLY = [
  /\bgracias\s+por\s+(comunicarte|comunicarse|contactarnos|contactar(nos)?|escribirnos|escribir(nos)?|tu\s+mensaje|su\s+mensaje|ponerte\s+en\s+contacto)/i,
  /\b(mensaje|respuesta)\s+autom[aá]tic[oa]/i,
  /\ben\s+este\s+momento\s+(no\s+(podemos|estamos|nos\s+encontramos|puedo|me\s+encuentro)|nos\s+encontramos\s+(ocupados|fuera))/i,
  /\b(fuera\s+de|nuestro|nuestros)\s+(horario|horarios)\b/i,
  /\bhorario\s+de\s+(atenci[oó]n|servicio|oficina)\b/i,
  /\b(te|le|lo)\s+(responder[ée]mos|atender[ée]mos|contestar[ée]mos)\s+(en\s+breve|a\s+la\s+brevedad|lo\s+antes\s+posible|pronto)/i,
  /\bnos\s+pondr[ée]mos\s+en\s+contacto\b/i,
  /\bregresa(mos)?\s+(en|a\s+las)\b.*\bhoras?\b/i,
  /\bun\s+asesor\s+(te|le)\s+(atender[áa]|responder[áa]|contactar[áa])/i,
  /\bno\s+(estamos|estoy)\s+disponibles?\b/i,
]
/** ¿Es una respuesta automática del negocio y no una persona? Se ignora para no contestarle a un bot. */
export function isAutoReply(text: string): boolean {
  const t = text.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return AUTO_REPLY.some(re => re.test(text) || re.test(t))
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
