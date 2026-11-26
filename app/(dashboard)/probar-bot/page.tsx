import { redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { hasCapability } from '@/lib/profiles/registry'
import { BotTester } from '@/components/dashboard/bot-tester'

/** Chat de prueba con el asistente, sin WhatsApp. Ojo: usa el asistente real y puede crear reservas en la agenda. */
export default async function BotTestPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'properties')) redirect('/appointments')
  return (
    <div className="space-y-3">
      <h1 className="text-[22px] font-semibold tracking-tight">Probar el bot</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        Chatea como si fueras un anfitrión con el botón <b>Probar el bot</b> (abajo a la derecha). No manda WhatsApp al cliente,
        pero las reservas que confirmes sí quedan en la agenda.
      </p>
      <p className="max-w-xl text-sm text-muted-foreground">Chateas como el primer anfitrión registrado: el asistente ya conoce sus propiedades, pide la hora límite y asigna a quien esté libre.</p>
      <BotTester />
    </div>
  )
}
