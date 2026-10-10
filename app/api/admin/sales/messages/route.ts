import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'

export async function GET(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('prospect')
  if (!id) return NextResponse.json({ error: 'Falta el prospecto' }, { status: 400 })
  const db = createServiceClient()
  const { data } = await db.from('prospect_messages').select('id, role, kind, content, created_at').eq('prospect_id', id).order('created_at', { ascending: true })
  return NextResponse.json({ messages: data ?? [] })
}
