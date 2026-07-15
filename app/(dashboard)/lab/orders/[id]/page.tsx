import { notFound, redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { OrderDetail } from './order-detail'

interface Props { params: Promise<{ id: string }> }

export default async function LabOrderPage({ params }: Props) {
  const { id } = await params
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: order } = await db
    .from('lab_orders')
    .select(`
      *,
      customer:customers(id, name, phone),
      tests:lab_order_tests(id, test_id, price_at_order, test:lab_tests(name, description))
    `)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .single()

  if (!order) notFound()

  return <OrderDetail order={order} />
}
