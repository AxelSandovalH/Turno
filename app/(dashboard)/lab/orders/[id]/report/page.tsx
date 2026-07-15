import { notFound, redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { ReportDoc, type ReportCustomer, type ReportTest } from '@/components/lab/report-doc'

interface Props { params: Promise<{ id: string }> }

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: order } = await db
    .from('lab_orders')
    .select(`
      id, folio, status, created_at,
      customer:customers(name, phone, date_of_birth, gender),
      tests:lab_order_tests(
        id,
        test:lab_tests(name),
        results:lab_order_results(
          value, unit, ref_range, captured_at,
          analyte:lab_analytes(name),
          captured:staff!lab_order_results_captured_by_fkey(name, license_number)
        )
      )
    `)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .single()

  if (!order) notFound()

  const tests = order.tests as unknown as ReportTest[]
  if (!tests.some(t => t.results.length > 0)) redirect(`/lab/orders/${id}`)

  return (
    <ReportDoc
      org={organization}
      folio={order.folio}
      createdAt={order.created_at}
      customer={order.customer as unknown as ReportCustomer | null}
      tests={tests}
    />
  )
}
