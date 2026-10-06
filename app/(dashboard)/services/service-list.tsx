'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Clock, DollarSign, ImageUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Service } from '@/types/database'

interface ServiceListProps {
  services: Service[]
  organizationId: string
  /** El giro del negocio permite foto por servicio (capacidad 'service-photos') */
  photosEnabled?: boolean
}

const empty = { name: '', description: '', duration_minutes: '30', price: '', image_url: '' }

export function ServiceList({ services, organizationId, photosEnabled = false }: ServiceListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Sube la foto a Storage y deja la URL en el formulario; se guarda en la
  // base junto con el resto del servicio al darle "Guardar".
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Elige un archivo de imagen')
    if (file.size > 5 * 1024 * 1024) return toast.error('La foto no debe superar 5 MB')
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    // Nombre único por subida: el servicio nuevo aún no tiene id y así el
    // navegador nunca muestra una foto vieja desde caché
    const path = `services/${organizationId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('org-assets').upload(path, file)
    if (error) {
      setUploading(false)
      return toast.error(`No se pudo subir la foto: ${error.message}`)
    }
    const { data: { publicUrl } } = supabase.storage.from('org-assets').getPublicUrl(path)
    setForm(p => ({ ...p, image_url: publicUrl }))
    setUploading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      duration_minutes: String(s.duration_minutes),
      price: s.price != null ? String(s.price) : '',
      image_url: s.image_url ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    const duration = parseInt(form.duration_minutes)
    if (!duration || duration < 5) return toast.error('La duración mínima es 5 minutos')

    setLoading(true)
    const payload = {
      name: form.name,
      description: form.description || null,
      duration_minutes: duration,
      price: form.price ? parseFloat(form.price) : null,
      // Solo se toca image_url en giros con fotos: en el resto no se manda
      // para no pisar nada
      ...(photosEnabled ? { image_url: form.image_url || null } : {}),
    }

    if (editing) {
      const { error } = await supabase.from('services').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Servicio actualizado')
    } else {
      const { error } = await supabase.from('services').insert({ ...payload, organization_id: organizationId })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Servicio creado')
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('services').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success('Servicio eliminado')
    setDeleteId(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay servicios registrados. Agrega el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map(s => (
            <Card key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  {s.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt={s.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{s.name}</p>
                      {!s.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration_minutes} min
                      </span>
                      {s.price != null && (
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <DollarSign className="h-3.5 w-3.5" />
                          {Number(s.price).toLocaleString('es-MX')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Agregar servicio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {photosEnabled && (
              <div className="space-y-2">
                <Label>Foto (opcional)</Label>
                <div className="flex items-center gap-3">
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image_url} alt="Foto del servicio" className="h-20 w-20 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                      <ImageUp className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-1.5">
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => imageInputRef.current?.click()}>
                      {uploading ? 'Subiendo…' : form.image_url ? 'Cambiar foto' : 'Subir foto'}
                    </Button>
                    {form.image_url && (
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" /> Quitar foto
                      </button>
                    )}
                  </div>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máx 5 MB. Se muestra en tu página de reservas.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Corte, Corte + Barba, etc."
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                placeholder="Descripción breve del servicio"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duración (minutos)</Label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  placeholder="30"
                  value={form.duration_minutes}
                  onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio MXN (opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150.00"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || uploading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
