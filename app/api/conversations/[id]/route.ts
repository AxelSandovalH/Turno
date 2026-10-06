import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Elimina una conversación (y sus mensajes) del negocio del usuario logueado.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const organizationId = user?.user_metadata?.organization_id
  if (!user || !organizationId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createServiceClient()
  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

  const { error: msgErr } = await db.from('messages').delete().eq('conversation_id', id)
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })
  const { error } = await db.from('conversations').delete().eq('id', id).eq('organization_id', organizationId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
