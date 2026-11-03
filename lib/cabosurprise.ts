/**
 * Catálogo Cabo Surprise (2026, USD). Precio final, sin cargo adicional; el anticipo es el 50 % y lo calcula el sistema, no el modelo.
 * Los paquetes "solo cotización" (Signature, Premium, Luxury, más de la capacidad, cenas grupales aún no publicadas) no se cobran por chat.
 */
export type SurpriseProduct = 'anniversary' | 'wedding' | 'horse_photo' | 'cabin_stay' | 'horse_experience' | 'bachelorette' | 'group_dinner'
export type SurpriseVariant = 'standard' | 'signature' | 'premium' | 'luxury'

export const SURPRISE_DEPOSIT = 0.5

interface Pkg { name: string; min: number; max: number; usd: number; unit: string; includes: string }

const CATALOG: Record<Exclude<SurpriseProduct, 'group_dinner'>, { title: string; balance_days: number | null; pkgs: Pkg[] }> = {
  anniversary: {
    title: 'Private Anniversary Dinner & Celebrations', balance_days: null,
    pkgs: [
      { name: 'Romantic Dinner', min: 2, max: 2, usd: 790, unit: 'por evento', includes: 'Cena de tres tiempos, área privada, mobiliario, servicio y coordinación' },
      { name: 'Intimate Anniversary', min: 3, max: 5, usd: 1790, unit: 'por evento', includes: 'Cena privada, mobiliario, servicio y coordinación' },
      { name: 'Luxury Anniversary', min: 6, max: 8, usd: 2790, unit: 'por evento', includes: 'Cena privada, mobiliario, servicio y coordinación' },
      { name: 'Luxury Group Celebration', min: 9, max: 12, usd: 3790, unit: 'por evento', includes: 'Cena privada, mobiliario, servicio y coordinación' },
      { name: 'Grand Anniversary Dinner', min: 13, max: 15, usd: 4490, unit: 'por evento', includes: 'Cena privada, mobiliario, servicio y coordinación' },
    ],
  },
  wedding: {
    title: 'Exclusive Ranch Wedding Reception', balance_days: 30,
    pkgs: [
      { name: '10-30 invitados', min: 10, max: 30, usd: 6500, unit: 'por evento (6 horas)', includes: 'Uso exclusivo, mobiliario estándar, cena de menú definido, DJ/audio, iluminación, decoración básica y personal' },
      { name: '31-50 invitados', min: 31, max: 50, usd: 9500, unit: 'por evento (6 horas)', includes: 'Uso exclusivo, mobiliario estándar, cena de menú definido, DJ/audio, iluminación, decoración básica y personal' },
      { name: '51-80 invitados', min: 51, max: 80, usd: 13500, unit: 'por evento (6 horas)', includes: 'Uso exclusivo, mobiliario estándar, cena de menú definido, DJ/audio, iluminación, decoración básica y personal' },
      { name: '81-120 invitados', min: 81, max: 120, usd: 18500, unit: 'por evento (6 horas)', includes: 'Uso exclusivo, mobiliario estándar, cena de menú definido, DJ/audio, iluminación, decoración básica y personal' },
      { name: '121-150 invitados', min: 121, max: 150, usd: 23500, unit: 'por evento (6 horas)', includes: 'Uso exclusivo, mobiliario estándar, cena de menú definido, DJ/audio, iluminación, decoración básica y personal' },
      { name: '151-180 invitados', min: 151, max: 180, usd: 27500, unit: 'por evento (6 horas)', includes: 'Uso exclusivo, mobiliario estándar, cena de menú definido, DJ/audio, iluminación, decoración básica y personal' },
    ],
  },
  horse_photo: {
    title: 'Private Beach Horse Photoshoot', balance_days: 7,
    pkgs: [{ name: 'Sesión de 90 min, 2 personas', min: 1, max: 2, usd: 1250, unit: 'por sesión', includes: '2 caballos, fotógrafo, operador y coordinación; 25 imágenes editadas en 7 días' }],
  },
  cabin_stay: {
    title: 'Private Ranch Cabin Stay', balance_days: 7,
    pkgs: [{ name: 'Dos cabañas', min: 1, max: 4, usd: 425, unit: 'por noche', includes: '2 personas por cabaña, máximo 4' }],
  },
  horse_experience: {
    title: 'Private Beach Horse Experience', balance_days: 7,
    pkgs: [{ name: 'Hasta 4 participantes', min: 1, max: 4, usd: 1600, unit: 'por experiencia', includes: '4 caballos y guía; permisos y acceso sujetos a validación' }],
  },
  bachelorette: {
    title: 'Cabo Bachelorette Ranch Party', balance_days: null,
    pkgs: [
      { name: 'Hasta 5 invitados', min: 1, max: 5, usd: 1490, unit: 'por evento', includes: 'Espacio privado, DJ, bartender, personal y montaje sencillo. Bebidas y alimentos no incluidos' },
      { name: '6-10 invitados', min: 6, max: 10, usd: 1990, unit: 'por evento', includes: 'Espacio privado, DJ, bartender, personal y montaje sencillo. Bebidas y alimentos no incluidos' },
      { name: '11-20 invitados', min: 11, max: 20, usd: 2790, unit: 'por evento', includes: 'Espacio privado, DJ, bartender, personal y montaje sencillo. Bebidas y alimentos no incluidos' },
      { name: '21-30 invitados', min: 21, max: 30, usd: 3800, unit: 'por evento', includes: 'Espacio privado, DJ, bartender, personal y montaje sencillo. Bebidas y alimentos no incluidos' },
    ],
  },
}

export interface SurpriseInput { product: SurpriseProduct; guests: number; nights?: number; variant?: SurpriseVariant }
export type SurpriseQuote =
  | { ok: true; quote_only: false; title: string; package: string; includes: string; unit: string; unit_price: number; nights?: number; total: number; deposit: number; balance_days: number | null }
  | { ok: true; quote_only: true; title: string; reason: string }
  | { ok: false; error: string }

const r2 = (n: number) => Math.round(n * 100) / 100

export function quoteSurprise(i: SurpriseInput): SurpriseQuote {
  if (i.product === 'group_dinner') return { ok: true, quote_only: true, title: 'Private Group Dinners', reason: 'Las cenas grupales aún no se publican con precio: se cotizan con el equipo (diferéncialas del Anniversary: sin decoración romántica premium).' }
  const cat = CATALOG[i.product]
  if (!cat) return { ok: false, error: 'Producto no reconocido' }
  const guests = Math.floor(Number(i.guests))
  if (!(guests >= 1)) return { ok: false, error: 'Falta el número de personas' }

  if (i.variant && i.variant !== 'standard') {
    const reason = i.product === 'anniversary' && i.variant === 'signature' ? 'Signature Dinner (mejor decoración y servicio para 2) se cotiza aparte con el equipo; el cobro automático para 2 es Romantic Dinner.'
      : i.product === 'wedding' && (i.variant === 'premium' || i.variant === 'luxury') ? `${i.variant === 'premium' ? 'Premium' : 'Luxury'} Wedding es solo cotización personalizada: se necesita número de invitados y alcance.`
      : null
    if (reason) return { ok: true, quote_only: true, title: cat.title, reason }
  }

  const pkg = cat.pkgs.find(p => guests >= p.min && guests <= p.max)
  if (!pkg) {
    const lo = Math.min(...cat.pkgs.map(p => p.min)), hi = Math.max(...cat.pkgs.map(p => p.max))
    if (guests > hi) return { ok: true, quote_only: true, title: cat.title, reason: `Más de ${hi} personas se cotiza de forma personalizada con el equipo (capacidad máxima en bodas: 180).` }
    return { ok: false, error: `Este paquete es para ${lo} a ${hi} personas.` }
  }

  let total = pkg.usd, nights: number | undefined
  if (i.product === 'cabin_stay') {
    nights = Math.floor(Number(i.nights))
    if (!(nights >= 1) || nights > 30) return { ok: false, error: 'Falta el número de noches (1 a 30)' }
    total = pkg.usd * nights
  }
  total = r2(total)
  return { ok: true, quote_only: false, title: cat.title, package: pkg.name, includes: pkg.includes, unit: pkg.unit, unit_price: pkg.usd, nights, total, deposit: r2(total * SURPRISE_DEPOSIT), balance_days: cat.balance_days }
}
