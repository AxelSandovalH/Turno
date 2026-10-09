'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ImageUp, X, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Extra { name: string; price: number }
interface Category { id: string; name: string }
interface Item { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; extras: Extra[]; is_available: boolean }
interface Settings { accepting: boolean; deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFee: string; minAmount: string }

const emptyItem = { name: '', description: '', price: '', category_id: '', image_url: '', extras: [] as { name: string; price: string }[], is_available: true }
const money = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
const nativeSelect = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring'

export function MenuManager({ organizationId, orderUrl, settings: initial, categories, items }: {
  organizationId: string; orderUrl: string; settings: Settings; categories: Category[]; items: Item[]
}) {
  const router = useRouter()
  const supabase = createClient()

  // ── Configuración de entrega y pago ─────────────────────────────────────────
  const [settings, setSettings] = useState(initial)
  const [savingSettings, setSavingSettings] = useState(false)

  async function saveSettings() {
    setSavingSettings(true)
    const { error } = await supabase.from('organizations').update({
      order_accepting: settings.accepting,
      order_delivery_enabled: settings.deliveryEnabled,
      order_pickup_enabled: settings.pickupEnabled,
      order_delivery_fee: Math.max(0, parseFloat(settings.deliveryFee) || 0),
      order_min_amount: Math.max(0, parseFloat(settings.minAmount) || 0),
    }).eq('id', organizationId)
    setSavingSettings(false)
    if (error) return toast.error(error.message)
    toast.success('Configuración guardada')
    router.refresh()
  }

  // ── Categorías ──────────────────────────────────────────────────────────────
  const [newCategory, setNewCategory] = useState('')

  async function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    const { error } = await supabase.from('menu_categories').insert({ organization_id: organizationId, name, sort_order: categories.length })
    if (error) return toast.error(error.message)
    setNewCategory('')
    router.refresh()
  }

  async function deleteCategory(c: Category) {
    const count = items.filter(i => i.category_id === c.id).length
    if (!window.confirm(count ? `"${c.name}" tiene ${count} platillo(s). Se quedarán sin categoría. ¿Eliminar?` : `¿Eliminar la categoría "${c.name}"?`)) return
    const { error } = await supabase.from('menu_categories').delete().eq('id', c.id)
    if (error) return toast.error(error.message)
    router.refresh()
  }

  // ── Platillos ───────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState(emptyItem)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function openCreate(categoryId = '') {
    setEditing(null); setForm({ ...emptyItem, category_id: categoryId }); setOpen(true)
  }
  function openEdit(i: Item) {
    setEditing(i)
    setForm({
      name: i.name, description: i.description ?? '', price: String(i.price), category_id: i.category_id ?? '',
      image_url: i.image_url ?? '', extras: i.extras.map(e => ({ name: e.name, price: String(e.price) })), is_available: i.is_available,
    })
    setOpen(true)
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Elige un archivo de imagen')
    if (file.size > 5 * 1024 * 1024) return toast.error('La foto no debe superar 5 MB')
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `menu/${organizationId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('org-assets').upload(path, file)
    if (error) { setUploading(false); return toast.error(`No se pudo subir la foto: ${error.message}`) }
    const { data: { publicUrl } } = supabase.storage.from('org-assets').getPublicUrl(path)
    setForm(p => ({ ...p, image_url: publicUrl }))
    setUploading(false)
  }

  async function saveItem() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    const price = parseFloat(form.price)
    if (Number.isNaN(price) || price < 0) return toast.error('Escribe un precio válido')
    const extras = form.extras
      .filter(e => e.name.trim())
      .map(e => ({ name: e.name.trim(), price: Math.max(0, parseFloat(e.price) || 0) }))
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      extras,
      is_available: form.is_available,
    }
    setSaving(true)
    const { error } = editing
      ? await supabase.from('menu_items').update(payload).eq('id', editing.id)
      : await supabase.from('menu_items').insert({ ...payload, organization_id: organizationId })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(editing ? 'Platillo actualizado' : 'Platillo creado')
    setOpen(false)
    router.refresh()
  }

  async function toggleAvailable(i: Item) {
    const { error } = await supabase.from('menu_items').update({ is_available: !i.is_available }).eq('id', i.id)
    if (error) return toast.error(error.message)
    router.refresh()
  }

  async function deleteItem(i: Item) {
    if (!window.confirm(`¿Eliminar "${i.name}"?`)) return
    const { error } = await supabase.from('menu_items').delete().eq('id', i.id)
    if (error) return toast.error(error.message)
    router.refresh()
  }

  const groups = [
    ...categories.map(c => ({ id: c.id, name: c.name, category: c, items: items.filter(i => i.category_id === c.id) })),
    ...(items.some(i => !i.category_id || !categories.some(c => c.id === i.category_id))
      ? [{ id: '', name: 'Sin categoría', category: null, items: items.filter(i => !i.category_id || !categories.some(c => c.id === i.category_id)) }]
      : []),
  ]

  return (
    <>
      {/* Link público */}
      <Card>
        <CardContent className="pt-4 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Tu link para pedidos</p>
            <p className="text-xs text-muted-foreground truncate">{orderUrl}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(orderUrl); toast.success('Link copiado') }}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar
          </Button>
          <Button size="sm" variant="outline" render={<a href={orderUrl} target="_blank" rel="noreferrer" />}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
          </Button>
        </CardContent>
      </Card>

      {/* Entrega y pago */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <p className="text-sm font-semibold">Entrega</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['accepting', 'Recibiendo pedidos'],
              ['deliveryEnabled', 'Entrega a domicilio'],
              ['pickupEnabled', 'Pedidos para recoger'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                {label}
                <Switch checked={settings[key]} onCheckedChange={v => setSettings(p => ({ ...p, [key]: v }))} />
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Costo de envío (MXN)</Label>
              <Input type="number" min="0" step="1" value={settings.deliveryFee} onChange={e => setSettings(p => ({ ...p, deliveryFee: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Pedido mínimo (MXN)</Label>
              <Input type="number" min="0" step="1" value={settings.minAmount} onChange={e => setSettings(p => ({ ...p, minAmount: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Los pedidos se cobran en línea con tarjeta (Stripe). Si cancelas un pedido ya pagado, se reembolsa solo.</p>
          <Button onClick={saveSettings} disabled={savingSettings}>{savingSettings ? 'Guardando...' : 'Guardar configuración'}</Button>
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <p className="text-sm font-semibold">Categorías</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <Badge key={c.id} variant="secondary" className="gap-1.5 pr-1">
                {c.name}
                <button aria-label={`Eliminar ${c.name}`} onClick={() => deleteCategory(c)} className="rounded-full hover:bg-background/60 p-0.5"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {categories.length === 0 && <p className="text-xs text-muted-foreground">Crea categorías como Tacos, Bebidas o Postres.</p>}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input placeholder="Nueva categoría" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <Button variant="outline" onClick={addCategory}>Agregar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Platillos */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Platillos</h2>
        <Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" /> Agregar platillo</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Aún no hay platillos. Agrega el primero.</CardContent></Card>
      ) : groups.filter(g => g.items.length).map(g => (
        <div key={g.id || 'none'} className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{g.name}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map(i => (
              <Card key={i.id} className={!i.is_available ? 'opacity-60' : ''}>
                <CardContent className="pt-3 pb-3 flex items-start gap-3">
                  {i.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image_url} alt={i.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-sm">{money(i.price)}{i.extras.length > 0 && <span className="text-xs text-muted-foreground"> · {i.extras.length} extra(s)</span>}</p>
                    <label className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <Switch size="sm" checked={i.is_available} onCheckedChange={() => toggleAvailable(i)} />
                      {i.is_available ? 'Disponible' : 'Agotado'}
                    </label>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Eliminar" className="text-destructive hover:text-destructive" onClick={() => deleteItem(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar platillo' : 'Agregar platillo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Foto (opcional)</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="Foto del platillo" className="h-20 w-20 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground"><ImageUp className="h-5 w-5" /></div>
                )}
                <div className="flex flex-col items-start gap-1.5">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? 'Subiendo…' : form.image_url ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, image_url: '' }))} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" /> Quitar foto
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Taco al pastor, Café americano…" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio MXN</Label>
                <Input type="number" min="0" step="0.5" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select className={nativeSelect} value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Extras opcionales</Label>
              {form.extras.map((e, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder="Queso extra" value={e.name} onChange={ev => setForm(p => ({ ...p, extras: p.extras.map((x, k) => k === idx ? { ...x, name: ev.target.value } : x) }))} />
                  <Input className="w-24" type="number" min="0" placeholder="$" value={e.price} onChange={ev => setForm(p => ({ ...p, extras: p.extras.map((x, k) => k === idx ? { ...x, price: ev.target.value } : x) }))} />
                  <Button type="button" size="icon" variant="ghost" aria-label="Quitar extra" onClick={() => setForm(p => ({ ...p, extras: p.extras.filter((_, k) => k !== idx) }))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, extras: [...p.extras, { name: '', price: '' }] }))}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar extra
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem} disabled={saving || uploading}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
