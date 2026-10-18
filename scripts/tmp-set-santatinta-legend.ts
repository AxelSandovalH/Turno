/**
 * TEMPORAL — Pone la leyenda de precio en los servicios de la org "santatinta".
 * Run: npx tsx scripts/tmp-set-santatinta-legend.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const LEGEND = 'El costo total del tatuaje se confirma en recepción.'

async function main() {
  const { data: org, error: orgErr } = await db
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', 'santatinta')
    .single()
  if (orgErr || !org) throw new Error('org santatinta no encontrada: ' + orgErr?.message)
  console.log('Org:', org.name, org.id)

  const { data: before } = await db
    .from('services')
    .select('id, name, price, description')
    .eq('organization_id', org.id)
    .order('name')
  console.log('\nAntes:')
  for (const s of before ?? []) console.log(` - ${s.name} ($${s.price}) — desc: ${JSON.stringify(s.description)}`)

  const { error: updErr, count } = await db
    .from('services')
    .update({ description: LEGEND }, { count: 'exact' })
    .eq('organization_id', org.id)
  if (updErr) throw new Error('update falló: ' + updErr.message)
  console.log(`\nActualizados: ${count} servicios`)

  const { data: after } = await db
    .from('services')
    .select('name, description')
    .eq('organization_id', org.id)
    .order('name')
  console.log('\nDespués:')
  for (const s of after ?? []) console.log(` - ${s.name} — ${s.description}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
