import { requireOrganization } from '@/lib/auth'
import { NewPatientForm } from './new-patient-form'

export default async function NewPatientPage() {
  const { organization } = await requireOrganization()
  const isMedical = !!organization.business_type && organization.business_type !== 'barbershop'
  return (
    <div className="p-6 max-w-xl">
      <NewPatientForm organizationId={organization.id} isMedical={isMedical} />
    </div>
  )
}
