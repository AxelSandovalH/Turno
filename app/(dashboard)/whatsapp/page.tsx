import { redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { ConnectPanel } from './connect-panel'

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  const { organization } = await requireOrganization()
  // Solo los planes con asistente usan WhatsApp
  if (!organization.whatsapp_bot_enabled) redirect('/settings')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground text-sm">Conecta el número de tu negocio para que el asistente atienda a tus clientes</p>
      </div>
      <ConnectPanel businessName={organization.name} />
    </div>
  )
}
