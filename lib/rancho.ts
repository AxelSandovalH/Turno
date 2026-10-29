/**
 * Tarifas de Rancho McCoy (octubre 2026, PESOS MXN) y cotización calculada por el sistema, no por el modelo.
 * Dos listas: "general" (español) y "destination" (inglés, +30 %). Al subtotal se le suma SIEMPRE 16 % de IVA y 4 % de cargo
 * (ambos sobre el subtotal); el anticipo para apartar la fecha es el 30 % del total.
 * Decoración (desde) e iluminación (por cotizar) no se calculan: se cotizan aparte con el equipo.
 */
export type RanchoList = 'general' | 'destination'
export type RanchoCurrency = 'MXN' | 'USD'

export const RANCHO_IVA = 0.16
export const RANCHO_FEE = 0.04
export const RANCHO_DEPOSIT = 0.30

const TIERS: { max: number; general: number; destination: number }[] = [
  { max: 30, general: 10900, destination: 14170 },
  { max: 60, general: 14900, destination: 19370 },
  { max: 90, general: 18900, destination: 24570 },
  { max: 120, general: 23900, destination: 31070 },
  { max: 150, general: 29900, destination: 38870 },
  { max: 199, general: 38900, destination: 50570 },
]
const P = {
  cabin: { general: [0, 3500, 5500], destination: [0, 4550, 7150] },
  extraHours: { general: [0, 3200, 5000], destination: [0, 4160, 6500] },
  horses: { general: 5000, destination: 6500 },
  photoRanch: { general: 9500, destination: 12350 },
  photoBeach: { general: 14500, destination: 18850 },
  dinner: { general: 389, destination: 505.7 },
  openBar: { general: 349, destination: 453.7 },
  chair: { general: 170, destination: 221 },
  staff6h: { general: 3600, destination: 4680 },
  staffHour: { general: 600, destination: 780 },
  audio6h: { general: 13500, destination: 17550 },
} as const

export interface RanchoInput {
  list: RanchoList
  guests: number
  cabins?: number              // 0-2
  extra_hours?: number         // 0-2
  horses?: boolean             // experiencia con dos caballos
  photo?: 'none' | 'ranch' | 'beach'
  dinner?: boolean             // cena por persona (todos los invitados)
  open_bar?: boolean           // barra libre por persona (todos los invitados)
  crossback_chairs?: boolean   // silla crossback por persona
  staff_hours?: number         // personal operativo: 6 = paquete; otro valor = $/hora
  audio?: boolean
  currency: RanchoCurrency
}

export interface RanchoLine { label: string; mxn: number }
export interface RanchoQuote {
  ok: true
  currency: RanchoCurrency
  lines: RanchoLine[]
  subtotal_mxn: number; iva_mxn: number; fee_mxn: number; total_mxn: number
  fx_mxn_per_usd: number | null
  subtotal: number; iva: number; fee: number; total: number; deposit: number
  pending_quote: string[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function quoteRancho(i: RanchoInput): RanchoQuote | { ok: false; error: string } {
  const list = i.list === 'destination' ? 'destination' : 'general'
  const guests = Math.floor(Number(i.guests))
  if (!(guests >= 1) || guests > 199) return { ok: false, error: 'El rancho recibe de 1 a 199 invitados; para más, consulta al equipo.' }
  const tier = TIERS.find(t => guests <= t.max)!
  const lines: RanchoLine[] = [{ label: `Renta del rancho + mobiliario + 6 horas (${guests} invitados)`, mxn: tier[list] }]
  const cabins = Math.min(Math.max(Math.floor(i.cabins ?? 0), 0), 2)
  if (cabins) lines.push({ label: cabins === 1 ? 'Una cabaña' : 'Dos cabañas', mxn: P.cabin[list][cabins] })
  const eh = Math.min(Math.max(Math.floor(i.extra_hours ?? 0), 0), 2)
  if (eh) lines.push({ label: eh === 1 ? 'Una hora extra del rancho' : 'Dos horas extra del rancho', mxn: P.extraHours[list][eh] })
  if (i.horses) lines.push({ label: 'Experiencia con dos caballos', mxn: P.horses[list] })
  if (i.photo === 'ranch') lines.push({ label: 'Sesión de fotos en el rancho (1 h, dos caballos y camarógrafo)', mxn: P.photoRanch[list] })
  if (i.photo === 'beach') lines.push({ label: 'Sesión de fotos en la playa (1.5 h, dos caballos y camarógrafo)', mxn: P.photoBeach[list] })
  if (i.dinner) lines.push({ label: `Cena por platillo (${guests} personas)`, mxn: r2(P.dinner[list] * guests) })
  if (i.open_bar) lines.push({ label: `Barra libre (${guests} personas)`, mxn: r2(P.openBar[list] * guests) })
  if (i.crossback_chairs) lines.push({ label: `Silla crossback (${guests} personas)`, mxn: r2(P.chair[list] * guests) })
  if (i.staff_hours && i.staff_hours > 0) {
    const h = Math.min(Math.floor(i.staff_hours), 24)
    lines.push({ label: h === 6 ? 'Personal operativo (1 mesero, 1 bartender, 1 capitán) 6 h' : `Personal operativo ${h} h`, mxn: h === 6 ? P.staff6h[list] : P.staffHour[list] * h })
  }
  if (i.audio) lines.push({ label: 'Equipo de audio (6 h)', mxn: P.audio6h[list] })

  const subtotal_mxn = r2(lines.reduce((s, l) => s + l.mxn, 0))
  const iva_mxn = r2(subtotal_mxn * RANCHO_IVA)
  const fee_mxn = r2(subtotal_mxn * RANCHO_FEE)
  const total_mxn = r2(subtotal_mxn + iva_mxn + fee_mxn)

  let fx: number | null = null
  if (i.currency === 'USD') {
    fx = Number(process.env.MXN_PER_USD)
    if (!(fx > 0)) return { ok: false, error: 'El tipo de cambio a dólares no está configurado: ofrece pagar en pesos MXN o dile que el equipo confirma el monto en dólares.' }
  }
  const conv = (n: number) => (fx ? r2(n / fx) : n)
  const total = conv(total_mxn)
  return {
    ok: true, currency: i.currency, lines, subtotal_mxn, iva_mxn, fee_mxn, total_mxn, fx_mxn_per_usd: fx,
    subtotal: conv(subtotal_mxn), iva: conv(iva_mxn), fee: conv(fee_mxn), total, deposit: r2(total * RANCHO_DEPOSIT),
    pending_quote: ['Decoración (desde $17,900 MXN general / $23,270 Destination, según diseño)', 'Iluminación (por cotizar)'],
  }
}
