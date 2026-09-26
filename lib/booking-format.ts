// Formato de teléfono y hora para la página pública de reservas.

export interface Country { code: string; label: string }

/** México primero (default); el resto por cercanía de mercado. */
export const COUNTRIES: readonly Country[] = [
  { code: '52',  label: 'México' },
  { code: '1',   label: 'EE. UU. / Canadá' },
  { code: '57',  label: 'Colombia' },
  { code: '54',  label: 'Argentina' },
  { code: '56',  label: 'Chile' },
  { code: '51',  label: 'Perú' },
  { code: '593', label: 'Ecuador' },
  { code: '506', label: 'Costa Rica' },
  { code: '507', label: 'Panamá' },
  { code: '502', label: 'Guatemala' },
  { code: '503', label: 'El Salvador' },
  { code: '504', label: 'Honduras' },
  { code: '505', label: 'Nicaragua' },
  { code: '58',  label: 'Venezuela' },
  { code: '591', label: 'Bolivia' },
  { code: '595', label: 'Paraguay' },
  { code: '598', label: 'Uruguay' },
  { code: '55',  label: 'Brasil' },
  { code: '34',  label: 'España' },
  { code: '44',  label: 'Reino Unido' },
]

export const DEFAULT_COUNTRY = '52'

/**
 * Arma el teléfono en dígitos (sin +) listo para guardar y para WhatsApp.
 * Devuelve '' si el número no es válido todavía.
 *
 * México: el bot guarda a sus clientes como 521 + 10 dígitos (así los manda
 * WhatsApp). Usamos el mismo formato para que quien reserva por la web y luego
 * escribe al bot sea el mismo cliente, no un duplicado. Se toleran 52 / 521
 * pegados dentro del campo.
 */
export function buildPhone(code: string, national: string): string {
  const digits = national.replace(/\D/g, '')
  if (code === '52') {
    const last10 = digits.slice(-10)
    return last10.length === 10 ? `521${last10}` : ''
  }
  return digits.length >= 6 && digits.length <= 14 ? `${code}${digits}` : ''
}

/** Teléfono legible para mostrar al cliente: +52 312 226 5985 */
export function displayPhone(code: string, national: string): string {
  const digits = national.replace(/\D/g, '')
  if (code === '52') {
    const d = digits.slice(-10)
    return `+52 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`.trim()
  }
  return `+${code} ${digits}`.trim()
}

/** "13:30" → "1:30 PM" · "00:15" → "12:15 AM" · "12:00" → "12:00 PM" */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}
