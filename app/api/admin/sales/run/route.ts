import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/admin-guard'
import { runOutreach } from '@/lib/sales/outreach'

// Una pasada de envíos en este momento (con las mismas reglas del cron: tope diario, máx. 3 con pausas).
export const maxDuration = 120

export async function POST() {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  try {
    return NextResponse.json(await runOutreach())
  } catch (err) {
    console.error('[sales] pasada manual falló:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Falló el envío' }, { status: 500 })
  }
}
