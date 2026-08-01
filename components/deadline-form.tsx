'use client'

import { useState } from 'react'
import { createDeadline } from '@/app/actions/deadlines'
import { AREAS, AREA_KEYS, RECURRENCE } from '@/lib/constants'
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

export function DeadlineForm({ defaultArea }: { defaultArea?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [area, setArea] = useState(defaultArea ?? 'legal')
  const [recurrence, setRecurrence] = useState('unico')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const dueDate = String(form.get('dueDate') ?? '')
    if (!title || !dueDate) return

    setLoading(true)
    try {
      await createDeadline({
        title,
        description: String(form.get('description') ?? ''),
        category: area,
        amount: form.get('amount') ? Number(form.get('amount')) : null,
        dueDate: new Date(dueDate).toISOString(),
        recurrence,
      })
      toast.success('Vencimiento registrado')
      setOpen(false)
    } catch {
      toast.error('No se pudo registrar el vencimiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo vencimiento
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar vencimiento</DialogTitle>
            <DialogDescription>
              Pagos, habilitaciones o presentaciones con fecha límite.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="d-title">Título</Label>
              <Input id="d-title" name="title" required autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="d-desc">Descripción</Label>
              <Textarea id="d-desc" name="description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-date">Fecha límite</Label>
                <Input id="d-date" name="dueDate" type="date" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="d-amount">Monto (opcional)</Label>
                <Input
                  id="d-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
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
                <Label>Recurrencia</Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as string)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
