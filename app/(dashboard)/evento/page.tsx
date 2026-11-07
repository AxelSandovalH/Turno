import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { EventoClient } from './evento-client'

export default async function EventoPage() {
  const { organization } = await requireOrganization()
  const db = createServiceClient()
  const { data: events } = await db.from('events')
    .select('id, slug, title, subtitle, organizer, description, location, event_date, capacity, is_open, packages')
    .eq('organization_id', organization.id).order('event_date')
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi evento</h1>
        <p className="text-sm text-muted-foreground">Cambia aquí los textos, la fecha, el lugar y los paquetes. Se actualiza en tu página al guardar.</p>
      </div>
      <EventoClient events={events ?? []} baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''} />
    </div>
  )
}
