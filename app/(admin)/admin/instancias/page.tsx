import { createServiceClient } from '@/lib/supabase/service'
import { InstanceForm } from './instance-form'

export const dynamic = 'force-dynamic'

export default async function InstancesPage() {
  const db = createServiceClient()
  const [{ data: pool }, { data: waiting }] = await Promise.all([
    db.from('whatsapp_instances').select('id, instance_id, organization_id, assigned_at, created_at, org:organizations(name)').order('created_at', { ascending: false }),
    // Negocios con asistente que todavía no tienen línea
    db.from('organizations').select('id, name, slug, created_at').eq('whatsapp_bot_enabled', true).is('ultramsg_instance', null).eq('subscription_status', 'active').order('created_at'),
  ])
  const free = (pool ?? []).filter(i => !i.organization_id).length

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Instancias de WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reserva de instancias de UltraMsg. Cada negocio con asistente recibe una libre solo cuando abre la pantalla de WhatsApp.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="rounded-lg border border-border px-4 py-3"><p className="text-2xl font-semibold">{free}</p><p className="text-xs text-muted-foreground">libres</p></div>
        <div className="rounded-lg border border-border px-4 py-3"><p className="text-2xl font-semibold">{(pool ?? []).length - free}</p><p className="text-xs text-muted-foreground">asignadas</p></div>
        <div className={`rounded-lg border px-4 py-3 ${(waiting ?? []).length > free ? 'border-amber-500/50' : 'border-border'}`}><p className="text-2xl font-semibold">{(waiting ?? []).length}</p><p className="text-xs text-muted-foreground">negocios esperando</p></div>
      </div>

      {(waiting ?? []).length > free && (
        <p className="text-sm text-amber-500">Hay más negocios esperando que instancias libres. Compra instancias en UltraMsg y agrégalas aquí.</p>
      )}

      <InstanceForm />

      {(waiting ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Esperando línea</h2>
          <ul className="rounded-lg border border-border divide-y divide-border text-sm">
            {(waiting ?? []).map(o => (
              <li key={o.id} className="px-4 py-2.5 flex justify-between"><span>{o.name}</span><span className="text-muted-foreground">{o.slug}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Reserva</h2>
        {(pool ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay instancias en la reserva.</p>
        ) : (
          <ul className="rounded-lg border border-border divide-y divide-border text-sm">
            {(pool ?? []).map(i => {
              const org = i.org as unknown as { name: string } | { name: string }[] | null
              const orgName = Array.isArray(org) ? org[0]?.name : org?.name
              return (
                <li key={i.id} className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="font-mono">{i.instance_id}</span>
                  <span className={i.organization_id ? 'text-muted-foreground' : 'text-emerald-500'}>{i.organization_id ? `Asignada a ${orgName ?? 'un negocio'}` : 'Libre'}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
