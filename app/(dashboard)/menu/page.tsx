import { redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { MenuManager } from './menu-manager'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'orders')) redirect('/appointments')

  const db = createServiceClient()
  const [{ data: categories }, { data: items }] = await Promise.all([
    db.from('menu_categories').select('*').eq('organization_id', organization.id).order('sort_order').order('created_at'),
    db.from('menu_items').select('*').eq('organization_id', organization.id).order('sort_order').order('created_at'),
  ])

  // Negocios con citas y pedidos (farmacia) lo llaman catálogo de productos
  const catalog = hasCapability(organization.business_type, 'appointments')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{catalog ? 'Catálogo' : 'Menú'}</h1>
        <p className="text-muted-foreground text-sm">{catalog ? 'Tus productos, extras y las reglas de entrega' : 'Tus platillos, extras y las reglas de entrega'}</p>
      </div>
      <MenuManager
        organizationId={organization.id}
        currency={organization.currency ?? 'mxn'}
        catalog={catalog}
        orderUrl={`${baseUrl}/pedir/${organization.slug}`}
        settings={{
          accepting: organization.order_accepting,
          deliveryEnabled: organization.order_delivery_enabled,
          pickupEnabled: organization.order_pickup_enabled,
          deliveryFee: String(Number(organization.order_delivery_fee) || 0),
          minAmount: String(Number(organization.order_min_amount) || 0),
        }}
        categories={categories ?? []}
        items={(items ?? []).map(i => ({ ...i, price: Number(i.price), extras: Array.isArray(i.extras) ? i.extras : [] }))}
      />
    </div>
  )
}
