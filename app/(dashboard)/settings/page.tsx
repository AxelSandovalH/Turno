import { requireOrganization } from '@/lib/auth'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const { organization } = await requireOrganization()
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm">Ajusta los datos de tu negocio y el bot de WhatsApp</p>
      </div>
      <SettingsForm organization={organization} />
    </div>
  )
}
