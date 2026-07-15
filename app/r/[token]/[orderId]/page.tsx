import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { ReportDoc, type ReportCustomer, type ReportTest } from '@/components/lab/report-doc'
import type { Metadata } from 'next'

// Vista pública del reporte de resultados, autenticada por el portal_token del
// paciente (mismo mecanismo que el portal /p/[token]). Solo muestra órdenes
// que pertenecen a ese paciente y que ya tienen resultados.

interface Props { params: Promise<{ token: string; orderId: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Resultados de laboratorio', robots: { index: false, follow: false } }
}

export default async function PublicReportPage({ params }: Props) {
  const { token, orderId } = await params
  const db = createServiceClient()

  const { data: patient } = await db
    .from('customers')
    .select('id, organization_id')
    .eq('portal_token', token)
    .single()
  if (!patient) notFound()

  const [{ data: order }, { data: org }] = await Promise.all([
    db.from('lab_orders')
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
      .eq('id', orderId)
      .eq('customer_id', patient.id)
      .eq('organization_id', patient.organization_id)
      .single(),
    db.from('organizations')
      .select('name, address, phone, logo_url')
      .eq('id', patient.organization_id)
      .single(),
  ])

  if (!order || !org) notFound()

  const tests = order.tests as unknown as ReportTest[]
  if (!tests.some(t => t.results.length > 0)) notFound()

  return (
    <ReportDoc
      org={org}
      folio={order.folio}
      createdAt={order.created_at}
      customer={order.customer as unknown as ReportCustomer | null}
      tests={tests}
    />
  )
}
