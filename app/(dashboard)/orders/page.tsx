import { redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { AutoRefresh } from '@/components/dashboard/auto-refresh'
import { OrderBoard, type BoardOrder } from './order-board'

export const dynamic = 'force-dynamic'

const last24h = () => new Date(Date.now() - 24 * 3600_000).toISOString()

export default async function OrdersPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'orders')) redirect('/appointments')

  const db = createServiceClient()
  const since = last24h()
  const { data } = await db
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, fulfillment, address, notes, total, subtotal, delivery_fee, payment_method, status, source, created_at, items:order_items(id, name, quantity, extras, notes)')
    .eq('organization_id', organization.id)
    .or(`status.in.(pending,preparing,on_the_way),created_at.gte.${since}`)
    .order('created_at', { ascending: true })
    .limit(200)

  return (
    <div data-wide className="space-y-6">
      <AutoRefresh intervalMs={8000} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground text-sm">Cada cambio de estado le avisa al cliente por WhatsApp</p>
      </div>
      <OrderBoard orders={(data ?? []) as unknown as BoardOrder[]} />
    </div>
  )
}
