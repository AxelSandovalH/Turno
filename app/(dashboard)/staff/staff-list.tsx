'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Staff, StaffRoleTag } from '@/types/database'

interface StaffListProps {
  staff: Staff[]
  roleTags: StaffRoleTag[]
  organizationId: string
  staffLabel: string
}

function emptyForm(role: string) {
  return { name: '', phone: '', role, license_number: '', commission_type: 'percentage' as 'percentage' | 'fixed_per_session', commission_value: '' }
}

export function StaffList({ staff, roleTags: initialRoleTags, organizationId, staffLabel }: StaffListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(false)

  // Tags persistidas en staff_roles (con id, para poder renombrar/eliminar).
  // Se re-sincroniza cuando el server manda una lista nueva (router.refresh,
  // auto-sync de page.tsx) — useState solo tomaría el valor del primer montaje.
  const [tags, setTags] = useState<StaffRoleTag[]>(initialRoleTags)
  useEffect(() => { setTags(initialRoleTags) }, [initialRoleTags])
  // Única fuente de verdad para el selector: las etiquetas realmente
  // persistidas en staff_roles (page.tsx ya se encarga de sincronizar ahí
  // cualquier rol que el staff traiga en uso). Nada virtual/inyectado, para
  // que el selector y el CRUD de "Editar roles" siempre coincidan.
  const roleTags = tags.map(t => t.label).sort((a, b) => a.localeCompare(b, 'es'))

  const [form, setForm] = useState(emptyForm(roleTags[0] ?? ''))

  const [manageOpen, setManageOpen] = useState(false)
  const [manageNewTag, setManageNewTag] = useState('')
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [tagBusy, setTagBusy] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm(roleTags[0] ?? ''))
    setOpen(true)
  }

  function openEdit(s: Staff) {
    setEditing(s)
    setForm({
      name: s.name,
      phone: s.phone ?? '',
      role: s.role,
      license_number: s.license_number ?? '',
      commission_type: s.commission_type ?? 'percentage',
      commission_value: s.commission_value?.toString() ?? '',
    })
    setOpen(true)
  }

  function handleRoleSelect(value: string | null) {
    if (!value) return
    setForm(p => ({ ...p, role: value }))
  }

  // ── Gestión de roles (modal "Editar roles") ────────────────────────────────────
  async function handleManageCreateTag() {
    const label = manageNewTag.trim()
    if (!label) return
    if (tags.some(t => t.label.toLowerCase() === label.toLowerCase())) {
      return toast.error('Esa etiqueta ya existe')
    }
    setTagBusy(true)
    const { data, error } = await supabase
      .from('staff_roles')
      .insert({ organization_id: organizationId, label })
      .select()
      .single()
    setTagBusy(false)
    if (error) { toast.error(error.message); return }
    setTags(prev => [...prev, data])
    setManageNewTag('')
    router.refresh()
  }

  function startRename(tag: StaffRoleTag) {
    setRenamingTagId(tag.id)
    setRenameValue(tag.label)
  }

  async function handleRenameTag(tag: StaffRoleTag) {
    const label = renameValue.trim()
    if (!label || label === tag.label) { setRenamingTagId(null); return }
    // Evita duplicados que solo difieren en mayúsculas/minúsculas (ej. "Dueño" vs "dueño")
    if (tags.some(t => t.id !== tag.id && t.label.toLowerCase() === label.toLowerCase())) {
      toast.error('Ya existe una etiqueta con ese nombre')
      return
    }
    setTagBusy(true)
    const { error } = await supabase.from('staff_roles').update({ label }).eq('id', tag.id)
    let cascadeError: string | null = null
    if (!error) {
      // Mantener sincronizado el texto que ya trae el staff que usaba la etiqueta vieja
      const { error: staffError } = await supabase
        .from('staff')
        .update({ role: label })
        .eq('organization_id', organizationId)
        .eq('role', tag.label)
      cascadeError = staffError?.message ?? null
    }
    setTagBusy(false)
    if (error) { toast.error(error.message); return }
    setTags(prev => prev.map(t => t.id === tag.id ? { ...t, label } : t))
    setRenamingTagId(null)
    if (cascadeError) {
      toast.error(`Etiqueta renombrada, pero no se pudo actualizar el staff que la usaba: ${cascadeError}`)
    } else {
      toast.success('Etiqueta actualizada')
    }
    router.refresh()
  }

  async function handleDeleteTag() {
    if (!deleteTagId) return
    const tag = tags.find(t => t.id === deleteTagId)
    const inUse = tag ? staff.filter(s => s.role?.toLowerCase() === tag.label.toLowerCase()).length : 0
    if (inUse > 0) {
      setDeleteTagId(null)
      return toast.error(`No se puede eliminar: ${inUse} integrante${inUse > 1 ? 's' : ''} tiene${inUse > 1 ? 'n' : ''} este rol. Reasígnalos primero.`)
    }
    setTagBusy(true)
    const { error } = await supabase.from('staff_roles').delete().eq('id', deleteTagId)
    setTagBusy(false)
    if (error) { toast.error(error.message); return }
    setTags(prev => prev.filter(t => t.id !== deleteTagId))
    setDeleteTagId(null)
    toast.success('Etiqueta eliminada')
    router.refresh()
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    setLoading(true)

    const commissionPayload = {
      commission_type: form.commission_type,
      commission_value: form.commission_value ? parseFloat(form.commission_value) : 0,
    }
    if (editing) {
      const { error } = await supabase
        .from('staff')
        .update({ name: form.name, phone: form.phone || null, role: form.role, license_number: form.license_number || null, ...commissionPayload })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success(`${staffLabel} actualizado`)
    } else {
      const { error } = await supabase
        .from('staff')
        .insert({ organization_id: organizationId, name: form.name, phone: form.phone || null, role: form.role, license_number: form.license_number || null, ...commissionPayload })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success(`${staffLabel} agregado`)
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('staff').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success(`${staffLabel} eliminado`)
    setDeleteId(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setManageOpen(true)}>
          <Tag className="h-4 w-4 mr-2" />
          Editar roles
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Integrante
        </Button>
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay {staffLabel.toLowerCase()}s registrados. Agrega el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {staff.map(s => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {s.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <Badge variant="outline" className="text-xs">{s.role}</Badge>
                    {!s.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                  </div>
                  {s.phone && <p className="text-sm text-muted-foreground">{s.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(s.id)}
                    disabled={s.is_owner}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${staffLabel.toLowerCase()}` : `Agregar ${staffLabel.toLowerCase()}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Nombre completo"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono (opcional)</Label>
              <Input
                placeholder="521XXXXXXXXXX"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={handleRoleSelect}>
                <SelectTrigger>
                  <SelectValue>{form.role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roleTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Gestiona las etiquetas disponibles desde el botón "Editar roles"</p>
            </div>
            <div className="space-y-2">
              <Label>Cédula profesional (opcional)</Label>
              <Input
                placeholder="1234567"
                value={form.license_number}
                onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Aparece en documentos oficiales (ej. reporte de resultados)</p>
            </div>
          </div>

          {/* Comisión */}
          <div className="pt-3 border-t border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comisión</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.commission_type}
                  onValueChange={v => v && setForm(p => ({ ...p, commission_type: v as 'percentage' | 'fixed_per_session' }))}
                >
                  <SelectTrigger><SelectValue>{ form.commission_type === 'percentage' ? '% sobre ingreso' : 'Monto fijo por sesión' }</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% sobre ingreso</SelectItem>
                    <SelectItem value="fixed_per_session">Monto fijo por sesión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.commission_type === 'percentage' ? 'Porcentaje (%)' : 'Monto (MXN)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={form.commission_type === 'percentage' ? 100 : undefined}
                  placeholder={form.commission_type === 'percentage' ? '30' : '150'}
                  value={form.commission_value}
                  onChange={e => setForm(p => ({ ...p, commission_value: e.target.value }))}
                />
              </div>
            </div>
            {form.commission_value && (
              <p className="text-xs text-muted-foreground">
                {form.commission_type === 'percentage'
                  ? `Por cada $1,000 cobrados → $${(parseFloat(form.commission_value) * 10).toFixed(0)} de comisión`
                  : `Cada sesión completada → $${form.commission_value} de comisión`}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {staffLabel.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las citas existentes no se eliminarán.
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

      {/* Gestión de roles/etiquetas */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no has creado etiquetas propias. Agrega la primera abajo.</p>
            ) : (
              <div className="space-y-1.5">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                    {renamingTagId === tag.id ? (
                      <>
                        <Input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameTag(tag) } }}
                          autoFocus
                          className="h-8"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleRenameTag(tag)} disabled={tagBusy}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setRenamingTagId(null)} disabled={tagBusy}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{tag.label}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startRename(tag)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTagId(tag.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-border">
              <Input
                placeholder="Nueva etiqueta, ej. Masajista"
                value={manageNewTag}
                onChange={e => setManageNewTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManageCreateTag() } }}
              />
              <Button onClick={handleManageCreateTag} disabled={tagBusy || !manageNewTag.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTagId} onOpenChange={v => !v && setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quita del selector de roles. Si algún integrante todavía la tiene asignada, no se podrá eliminar hasta reasignarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTag} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
