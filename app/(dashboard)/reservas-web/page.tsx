import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { ReservasWebClient } from './reservas-web-client'

export default async function ReservasWebPage() {
  const { organization } = await requireOrganization()
  const db = createServiceClient()
  const { data } = await db.from('web_bookings')
    .select('id, source, service_name, customer_name, customer_phone, customer_email, booking_date, booking_time, location, notes, currency, paid_amount, total_amount, stripe_url, status, created_at')
    .eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(200)
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservas web</h1>
        <p className="text-sm text-muted-foreground">Pagos hechos desde los sitios del negocio. Contacta al cliente y márcalo como agendado.</p>
      </div>
      <ReservasWebClient rows={data ?? []} />
    </div>
  )
}
