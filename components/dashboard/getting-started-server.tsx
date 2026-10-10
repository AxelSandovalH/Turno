import { requireOrganization } from '@/lib/auth'
import { getSetupSteps } from '@/lib/setup-steps'
import { GettingStarted } from './getting-started'

/** Calcula los pasos con datos reales y los pinta; no muestra nada si ya terminó. */
export async function GettingStartedServer() {
  const { organization } = await requireOrganization()
  const { steps, shareUrl } = await getSetupSteps(organization)
  if (steps.length === 0 || steps.every(s => s.done) && !shareUrl) return null
  return <GettingStarted organizationId={organization.id} steps={steps} shareUrl={shareUrl} />
}
