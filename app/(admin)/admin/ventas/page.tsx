import { fromZonedTime } from 'date-fns-tz'
import { createServiceClient } from '@/lib/supabase/service'
import { SalesPanel, type ProspectRow, type ConfigView } from './sales-panel'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const db = createServiceClient()
  const { data: cfg } = await db.from('sales_config').select('*').eq('id', 1).single()
  const tz = cfg?.timezone ?? 'America/Mazatlan'
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const dayStart = fromZonedTime(`${ymd}T00:00:00`, tz).toISOString()

  const [{ data: prospects }, { data: today }, { data: orgs }, { data: free }] = await Promise.all([
    db.from('prospects').select('id, name, contact_name, phone, segment, city, status, followups_sent, handoff_reason, offer_link, last_contact_at, last_inbound_at, created_at').order('created_at', { ascending: false }).limit(300),
    db.from('prospect_messages').select('id').in('kind', ['first', 'followup']).gte('created_at', dayStart),
    db.from('organizations').select('slug, name').not('ultramsg_instance', 'is', null).order('name'),
    db.from('whatsapp_instances').select('instance_id').is('organization_id', null).is('reserved_for', null).order('created_at'),
  ])

  const config: ConfigView = {
    enabled: !!cfg?.enabled,
    lineReady: !!(cfg?.ultramsg_instance && cfg?.ultramsg_token),
    lineName: cfg?.ultramsg_instance ?? null,
    owner_phone: cfg?.owner_phone ?? '',
    daily_limit: cfg?.daily_limit ?? 15,
    send_start_hour: cfg?.send_start_hour ?? 9,
    send_end_hour: cfg?.send_end_hour ?? 18,
    max_followups: cfg?.max_followups ?? 2,
    followup_after_days: cfg?.followup_after_days ?? 3,
  }

  return <SalesPanel config={config} prospects={(prospects ?? []) as ProspectRow[]} sentToday={(today ?? []).length} orgs={orgs ?? []} freeInstances={(free ?? []).map(f => f.instance_id)} />
}
