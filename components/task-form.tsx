'use client'

import { useState } from 'react'
import { createTask } from '@/app/actions/tasks'
import { AREAS, AREA_KEYS, PRIORITIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { TeamMember } from '@/lib/types'

const UNASSIGNED = 'Sin asignar'

export function TaskForm({
  defaultArea,
  team = [],
}: {
  defaultArea?: string
  team?: TeamMember[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [area, setArea] = useState(defaultArea ?? 'legal')
  const [priority, setPriority] = useState('media')
  const [assignee, setAssignee] = useState(UNASSIGNED)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title) return

    setLoading(true)
    try {
      await createTask({
        title,
        description: String(form.get('description') ?? ''),
        area,
        priority,
        assignee: assignee === UNASSIGNED ? '' : assignee,
        dueDate: form.get('dueDate')
          ? new Date(String(form.get('dueDate'))).toISOString()
          : null,
      })
      toast.success('Tarea creada')
      setAssignee(UNASSIGNED)
      setOpen(false)
    } catch {
      toast.error('No se pudo crear la tarea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nueva tarea
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear tarea</DialogTitle>
            <DialogDescription>
              Agregala al tablero del equipo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-title">Título</Label>
              <Input id="t-title" name="title" required autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-desc">Descripción</Label>
              <Textarea id="t-desc" name="description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Área</Label>
                <Select value={area} onValueChange={(v) => setArea(v as string)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {AREAS[k].short}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prioridad</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as string)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Responsable</Label>
                <Select value={assignee} onValueChange={(v) => setAssignee(v as string)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
                    {team
                      .filter((m) => m.name)
                      .map((m) => (
                        <SelectItem key={m.userId} value={m.name as string}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-date">Fecha límite</Label>
                <Input id="t-date" name="dueDate" type="date" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
