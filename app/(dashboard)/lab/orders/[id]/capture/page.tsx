import { notFound, redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { CaptureClient } from './capture-client'

interface Props { params: Promise<{ id: string }> }

export default async function CapturePage({ params }: Props) {
  const { id } = await params
  const { organization, user } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()

  const [{ data: order }, { data: staffRec }] = await Promise.all([
    db.from('lab_orders')
      .select(`
        id, folio, status,
        customer:customers(name, phone),
        tests:lab_order_tests(
          id,
          test:lab_tests(id, name, lab_test_analytes(sort_order, analyte:lab_analytes(id, name, default_unit, ref_range))),
          results:lab_order_results(analyte_id, value, unit, ref_range)
        )
      `)
      .eq('id', id)
      .eq('organization_id', organization.id)
      .single(),
    db.from('staff')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (!order) notFound()
  // Capturar solo tiene sentido antes de entregar/cancelar
  if (order.status === 'delivered' || order.status === 'cancelled') redirect(`/lab/orders/${id}`)

  return <CaptureClient order={order as never} staffId={staffRec?.id ?? null} />
}
