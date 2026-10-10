import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { SetupChat } from './setup-chat'

export const metadata = { title: 'Asistente de configuración' }

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id
  if (!user || !orgId) redirect('/login')

  const db = createServiceClient()
  const [{ data: org }, { count: drafts }] = await Promise.all([
    db.from('organizations').select('name, slug, business_type').eq('id', orgId).single(),
    db.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', false),
  ])
  if (!org) redirect('/login')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asistente de configuración</h1>
        <p className="text-muted-foreground text-sm">Conversa con la IA y deja listo tu negocio: servicios, equipo, horarios y tu página de reservas.</p>
      </div>
      <SetupChat orgName={org.name} slug={org.slug} usesAgenda={hasCapability(org.business_type, 'appointments')} drafts={drafts ?? 0} />
    </div>
  )
}
