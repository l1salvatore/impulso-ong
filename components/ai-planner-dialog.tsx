"use client"

import { useState } from "react"
import { planTasksFromGoal } from "@/app/actions/agent"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

const EXAMPLES = [
  "Organizar la inscripción del próximo curso de testing para 30 alumnos",
  "Renovar la habilitación de la ONG y poner al día las presentaciones legales",
  "Lanzar una campaña en redes para conseguir voluntarios docentes",
]

export function AiPlannerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [goal, setGoal] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count: number; summary: string } | null>(null)

  async function onGenerate() {
    if (!goal.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await planTasksFromGoal(goal.trim())
      setResult(res)
      toast.success(`La IA creó ${res.count} tareas en el tablero`)
    } catch {
      toast.error("No se pudo generar el plan. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setGoal("")
    setResult(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="size-5 text-primary" />
            Planificar con IA
          </DialogTitle>
          <DialogDescription>
            Describí un objetivo y la IA lo descompone en tareas concretas, las asigna a un área y las agrega al
            tablero.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Se crearon {result.count} tareas</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={reset}>
                Planificar otro
              </Button>
              <Button onClick={() => onOpenChange(false)}>Ver tablero</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="goal">Objetivo</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ej: Organizar la inscripción del próximo curso de testing"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Ejemplos</p>
              <div className="flex flex-col gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setGoal(ex)}
                    className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={onGenerate} disabled={loading || !goal.trim()} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generando plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generar tareas
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
