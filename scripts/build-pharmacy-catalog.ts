/**
 * Genera el SQL que carga el catálogo de la farmacia (Cabo Pharmacy) desde el CSV del inventario.
 *   npx tsx scripts/build-pharmacy-catalog.ts /ruta/catalogo.csv > supabase/seeds/pharmacy_catalog.sql
 * Reglas: entran los productos SIN receta (compra directa) y los CON receta (marcados requires_prescription: se ven en
 * el catálogo pero NO se pueden pedir directo; los atiende una persona que verifica la receta). Quedan fuera SIEMPRE los
 * controlados de fracción I, II y III (opioides, benzodiacepinas, estimulantes, tramadol) entran SOLO como inventario del
 * panel (controlled = true): no salen en la página pública, no los ve el bot y no se pueden pedir en línea.
 * Un producto sin precio entra como NO disponible hasta que tenga precio; al volver a correr el SQL con precios
 * llenos en el CSV se actualizan precio y disponibilidad.
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('Uso: tsx scripts/build-pharmacy-catalog.ts catalogo.csv'); process.exit(1) }

// Principios activos que, aunque el CSV los marque sin receta, se dejan fuera hasta confirmarlos con el dueño
const REVISAR = /sildenafil|tadalafil/i

const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const lines = readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
lines.shift() // encabezado

interface Row { sku: string; nombre: string; sustancia: string; presentacion: string; categoria: string; tipo: string; receta: string; grupo: string; precio: number }
const rows: Row[] = lines.map(l => {
  // El nombre puede traer comas sin comillas (p. ej. "1,200,000 UI"): se lee desde los extremos, que son columnas fijas
  const f = l.split(',').map(x => x.trim())
  const tail = f.slice(-8)
  const [sustancia, presentacion, categoria, tipo, receta, grupo, precio] = tail
  return { sku: f[0], nombre: f.slice(1, f.length - 8).join(','), sustancia, presentacion, categoria, tipo, receta: receta.toLowerCase(), grupo, precio: Number(String(precio).replace(/[^0-9.]/g, '')) || 0 }
})

const skipped = { revisar: 0 }
const FUERTE = /fracci[oó]n\s+(i|ii|iii)$/i
const kept = rows.filter(r => {
  if (REVISAR.test(r.nombre)) { skipped.revisar++; return false }
  return true
})

// Mismo nombre con distinta presentación (p. ej. preservativos de 3 y de 12): se distingue con la presentación
const count = new Map<string, number>()
for (const r of kept) count.set(r.nombre, (count.get(r.nombre) ?? 0) + 1)
const items = kept.map(r => ({
  name: (count.get(r.nombre)! > 1 ? `${r.nombre} (${r.presentacion})` : r.nombre).slice(0, 120),
  descr: [r.presentacion, r.sustancia].filter(Boolean).join(' · '),
  cat: r.categoria,
  price: r.precio,
  rx: r.receta !== 'no',
  ctl: FUERTE.test(r.grupo),
}))
const cats = [...new Set(items.map(i => i.cat))]

const out: string[] = []
out.push(`-- Catálogo de Cabo Pharmacy generado de ${file.split('/').pop()}: ${items.length} productos en ${cats.length} categorías.`)
out.push(`-- Con receta (se ven pero no se piden directo): ${items.filter(i => i.rx).length}. Controlados (solo panel, ocultos al público y al bot): ${items.filter(i => i.ctl).length}; por revisar: ${skipped.revisar}.`)
out.push(`-- Los productos sin precio entran como NO disponibles; ponles precio en Catálogo (o llena precio_venta en el CSV y vuelve a generar y correr este SQL).`)
out.push(`do $$`, `declare v_org uuid;`, `begin`)
out.push(`  select id into v_org from organizations where slug = 'cabo-pharmacy' and business_type = 'pharmacy' limit 1;`)
out.push(`  if v_org is null then raise exception 'No existe el negocio cabo-pharmacy'; end if;`)
out.push(`  create temp table _cat (name text, cat text, descr text, price numeric, rx boolean, ctl boolean) on commit drop;`)
out.push(`  insert into _cat values`)
out.push(items.map(i => `    (${q(i.name)}, ${q(i.cat)}, ${q(i.descr)}, ${i.price}, ${i.rx || i.ctl}, ${i.ctl})`).join(',\n') + ';')
out.push(`  insert into menu_categories (organization_id, name, sort_order)`)
out.push(`  select v_org, c.name, c.ord from (values ${cats.map((c, i) => `(${q(c)}, ${i})`).join(', ')}) as c(name, ord)`)
out.push(`  where not exists (select 1 from menu_categories x where x.organization_id = v_org and x.name = c.name);`)
out.push(`  -- Ya existentes: el precio solo cambia si el CSV trae precio; un producto con receta nunca queda disponible para pedir directo`)
out.push(`  update menu_items m set requires_prescription = t.rx, controlled = t.ctl,`)
out.push(`    price = case when t.price > 0 then t.price else m.price end,`)
out.push(`    is_available = case when t.rx or t.ctl then false when t.price > 0 then true else m.is_available end`)
out.push(`  from _cat t where m.organization_id = v_org and m.name = t.name;`)
out.push(`  insert into menu_items (organization_id, category_id, name, description, price, is_available, requires_prescription, controlled, sort_order)`)
out.push(`  select v_org, (select id from menu_categories c where c.organization_id = v_org and c.name = t.cat limit 1), t.name, t.descr, t.price, t.price > 0 and not t.rx, t.rx, t.ctl, 0`)
out.push(`  from _cat t where not exists (select 1 from menu_items x where x.organization_id = v_org and x.name = t.name);`)
out.push(`end $$;`)
console.log(out.join('\n'))
console.error(`OK: ${items.length} productos (${items.filter(i => i.rx).length} con receta, ${items.filter(i => i.ctl).length} controlados), ${cats.length} categorías | por revisar ${skipped.revisar} | con precio: ${items.filter(i => i.price > 0).length}`)
