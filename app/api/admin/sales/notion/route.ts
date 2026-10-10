import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { fetchNotionProspectLines } from '@/lib/sales/notion'
import { importProspects } from '@/lib/sales/import'
import { syncProspectsToNotion } from '@/lib/sales/notion-sync'

// Importa desde Notion los prospectos en estado "Por contactar" (los repetidos se omiten por teléfono).
export async function POST() {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  try {
    const { lines, skippedNoPhone } = await fetchNotionProspectLines()
    if (!lines.length) return NextResponse.json({ added: 0, duplicated: 0, invalid: [], skippedNoPhone })
    const r = await importProspects(lines.join('\n'))
    if (r.error) return NextResponse.json({ error: r.error }, { status: 500 })
    return NextResponse.json({ ...r, skippedNoPhone })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo leer Notion' }, { status: 502 })
  }
}

// Empuja a Notion el avance de los prospectos (estado, último contacto, qué respondieron).
export async function PUT() {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  try {
    return NextResponse.json(await syncProspectsToNotion())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo escribir en Notion' }, { status: 502 })
  }
}
