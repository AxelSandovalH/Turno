import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'

async function addProperty(form: FormData) {
  'use server'
  const { organization } = await requireOrganization()
  const db = createServiceClient()
  const customerId = String(form.get('customer_id') ?? '')
  const name = String(form.get('name') ?? '').trim().slice(0, 80)
  const zone = String(form.get('zone') ?? '').trim().slice(0, 60)
  if (!customerId || !name) return
  // El anfitrión debe ser de este negocio
  const { data: host } = await db.from('customers').select('id').eq('id', customerId).eq('organization_id', organization.id).maybeSingle()
  if (!host) return
  await db.from('properties').upsert({ organization_id: organization.id, customer_id: host.id, name, zone: zone || null, is_active: true }, { onConflict: 'customer_id,name' })
  revalidatePath('/propiedades')
}

/** Propiedades de cada anfitrión y su link personal de reservas. */
export default async function PropertiesPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'properties')) redirect('/appointments')
  const db = createServiceClient()
  const [{ data: hosts }, { data: props }] = await Promise.all([
    db.from('customers').select('id, name, booking_token').eq('organization_id', organization.id).order('name'),
    db.from('properties').select('id, customer_id, name, zone').eq('organization_id', organization.id).eq('is_active', true).order('name'),
  ])
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const field = 'rounded-lg border border-border bg-background px-3 py-2 text-sm'

  return (
    <div className="space-y-5">
      <h1 className="text-[22px] font-semibold tracking-tight">Propiedades</h1>

      <form action={addProperty} className="flex flex-wrap gap-2 rounded-lg border border-border p-3">
        <select name="customer_id" required className={field}>
          <option value="">Anfitrión…</option>
          {(hosts ?? []).map(h => <option key={h.id} value={h.id}>{h.name ?? 'Sin nombre'}</option>)}
        </select>
        <input name="name" required placeholder="Nombre de la propiedad" className={field} />
        <input name="zone" placeholder="Zona" className={field} />
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">Agregar</button>
      </form>

      <div className="space-y-3">
        {(hosts ?? []).map(h => {
          const mine = (props ?? []).filter(p => p.customer_id === h.id)
          return (
            <div key={h.id} className="rounded-lg border border-border p-4">
              <p className="font-medium">{h.name ?? 'Sin nombre'}</p>
              {h.booking_token && <p className="mt-0.5 break-all text-xs text-muted-foreground">Su link: {base}/book/{organization.slug}?h={h.booking_token}</p>}
              {mine.length === 0
                ? <p className="mt-2 text-sm text-muted-foreground">Sin propiedades registradas.</p>
                : <ul className="mt-2 space-y-1 text-sm">{mine.map(p => <li key={p.id}>🏠 {p.name}{p.zone ? <span className="text-muted-foreground"> · {p.zone}</span> : null}</li>)}</ul>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
