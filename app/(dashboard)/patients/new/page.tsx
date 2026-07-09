import { requireOrganization } from '@/lib/auth'
import { isMedicalVertical } from '@/lib/business-type'
import { NewPatientForm } from './new-patient-form'

export default async function NewPatientPage() {
  const { organization } = await requireOrganization()
  const isMedical = isMedicalVertical(organization.business_type)
  return (
    <div className="p-6 max-w-xl">
      <NewPatientForm organizationId={organization.id} isMedical={isMedical} />
    </div>
  )
}
