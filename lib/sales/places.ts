import { normalizeMxPhone } from '@/lib/sales/phone'

// Busca negocios en Google Places (API "New", Text Search) y devuelve líneas listas para importar:
// "Negocio, Teléfono, Giro, Ciudad". Requiere GOOGLE_PLACES_API_KEY.
interface Place { displayName?: { text?: string }; nationalPhoneNumber?: string; internationalPhoneNumber?: string; formattedAddress?: string; businessStatus?: string }

export interface PlacesResult { lines: string[]; found: number; withoutPhone: number; closed: number }

const clean = (s: string) => s.replace(/[,;\t\r\n]+/g, ' ').trim()

export async function searchPlaces(opts: { giro: string; city: string; maxPages?: number }): Promise<PlacesResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('Falta GOOGLE_PLACES_API_KEY en Vercel')
  const lines: string[] = []
  let found = 0, withoutPhone = 0, closed = 0
  let pageToken: string | undefined
  for (let page = 0; page < (opts.maxPages ?? 3); page++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.businessStatus,nextPageToken',
      },
      body: JSON.stringify({ textQuery: `${opts.giro} en ${opts.city}, México`, languageCode: 'es', regionCode: 'MX', pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
    })
    if (!res.ok) throw new Error(`Google Places respondió ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
    const data = await res.json() as { places?: Place[]; nextPageToken?: string }
    for (const p of data.places ?? []) {
      found++
      if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') { closed++; continue }
      const phone = normalizeMxPhone(p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? '')
      const name = clean(p.displayName?.text ?? '')
      if (!name || !phone) { withoutPhone++; continue }
      lines.push([name, phone, opts.giro, opts.city].map(clean).join(', '))
    }
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return { lines, found, withoutPhone, closed }
}
