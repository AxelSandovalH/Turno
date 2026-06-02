import { notFound } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { PatientDetail } from './patient-detail'

interface Props { params: Promise<{ id: string }> }

export default async function PatientPage({ params }: Props) {
  const { id } = await params
  const { organization } = await requireOrganization()
  const db = createServiceClient()

  const [
    { data: patient },
    { data: appointments },
    { data: notes },
    { data: plans },
    { data: payments },
    { data: attachments },
    { data: staff },
  ] = await Promise.all([
    db.from('customers').select('*').eq('id', id).eq('organization_id', organization.id).single(),
    db.from('appointments')
      .select('*, staff(name), service:services(name)')
      .eq('customer_id', id)
      .eq('organization_id', organization.id)
      .order('starts_at', { ascending: false })
      .limit(50),
    db.from('appointment_notes')
      .select('*, appointment:appointments(starts_at), staff(name)')
      .eq('organization_id', organization.id)
      .in('appointment_id',
        // get appointment ids for this patient
        (await db.from('appointments').select('id').eq('customer_id', id).eq('organization_id', organization.id)).data?.map(a => a.id) ?? []
      )
      .order('created_at', { ascending: false }),
    db.from('treatment_plans').select('*').eq('customer_id', id).eq('organization_id', organization.id).order('created_at', { ascending: false }),
    db.from('payments').select('*').eq('customer_id', id).eq('organization_id', organization.id).order('paid_at', { ascending: false }),
    db.from('attachments').select('*').eq('customer_id', id).eq('organization_id', organization.id).order('created_at', { ascending: false }),
    db.from('staff').select('id, name').eq('organization_id', organization.id).eq('is_active', true),
  ])

  if (!patient) notFound()

  return (
    <PatientDetail
      patient={patient}
      appointments={appointments ?? []}
      notes={notes ?? []}
      plans={plans ?? []}
      payments={payments ?? []}
      attachments={attachments ?? []}
      staff={staff ?? []}
      organizationId={organization.id}
    />
  )
}
