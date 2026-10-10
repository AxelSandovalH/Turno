import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { searchPlaces } from '@/lib/sales/places'
import { importProspects } from '@/lib/sales/import'
import { syncProspectsToNotion } from '@/lib/sales/notion-sync'

export const maxDuration = 60

// Busca negocios por giro y ciudad en Google Places, los importa como prospectos (sin repetir teléfonos)
// y los crea también en el CRM de Notion.
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const giro = String(b?.giro ?? '').trim(), city = String(b?.city ?? '').trim()
  if (!giro || !city) return NextResponse.json({ error: 'Elige un giro y una ciudad' }, { status: 400 })
  try {
    const found = await searchPlaces({ giro, city })
    const imported = found.lines.length ? await importProspects(found.lines.join('\n')) : { added: 0, duplicated: 0, invalid: [] as string[] }
    if ('error' in imported && imported.error) return NextResponse.json({ error: imported.error }, { status: 500 })
    // El CRM de Notion recibe los nuevos (si hay token); un fallo ahí no deshace la importación
    const notion = await syncProspectsToNotion({ createMissing: true }).catch(() => null)
    return NextResponse.json({ ...imported, found: found.found, withoutPhone: found.withoutPhone, closed: found.closed, notionCreated: notion?.created ?? 0 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo buscar' }, { status: 502 })
  }
}
