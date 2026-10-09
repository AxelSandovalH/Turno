import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { OrderForm } from './order-form'

interface Props { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name').eq('slug', slug).single()
  return { title: org ? `Pedir — ${org.name}` : 'Hacer pedido' }
}

export default async function OrderPage({ params }: Props) {
  const { slug } = await params
  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, address, logo_url, primary_color, business_type, is_active, order_delivery_enabled, order_pickup_enabled, order_delivery_fee, order_min_amount, order_payment_info, order_accepting')
    .eq('slug', slug)
    .single()

  if (!org || !org.is_active || !hasCapability(org.business_type, 'orders')) notFound()

  const [{ data: categories }, { data: items }] = await Promise.all([
    db.from('menu_categories').select('id, name').eq('organization_id', org.id).order('sort_order').order('created_at'),
    db.from('menu_items').select('id, category_id, name, description, price, image_url, extras, is_available').eq('organization_id', org.id).order('sort_order').order('created_at'),
  ])

  return (
    <OrderForm
      org={{
        slug: org.slug,
        name: org.name,
        address: org.address,
        logo_url: org.logo_url,
        accent: org.primary_color ?? '#f97316',
        deliveryEnabled: org.order_delivery_enabled,
        pickupEnabled: org.order_pickup_enabled,
        deliveryFee: Number(org.order_delivery_fee) || 0,
        minAmount: Number(org.order_min_amount) || 0,
        hasTransferInfo: !!org.order_payment_info?.trim(),
        accepting: org.order_accepting,
      }}
      categories={categories ?? []}
      items={(items ?? []).map(i => ({ ...i, price: Number(i.price), extras: Array.isArray(i.extras) ? i.extras : [] }))}
    />
  )
}
