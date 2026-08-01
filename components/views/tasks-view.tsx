"use client"

import { useState } from "react"
import type { Task, CurrentMember, TeamMember } from "@/lib/types"
import { TASK_STATUS_KEYS, TASK_STATUSES } from "@/lib/constants"
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PriorityBadge, AreaBadge, TaskStatusBadge } from "@/components/status-badges"
import { TaskForm } from "@/components/task-form"
import { AiPlannerDialog } from "@/components/ai-planner-dialog"
import { Sparkles, Trash2, MoreVertical, CalendarClock, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/ui-helpers"

const STATUS_DOT: Record<string, string> = {
  pendiente: "bg-muted-foreground",
  en_progreso: "bg-accent",
  hecho: "bg-primary",
}

export function TasksView({
  tasks,
  member,
  team,
}: {
  tasks: Task[]
  member: CurrentMember | null
  team: TeamMember[]
}) {
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const canManage = member?.role === "admin" || member?.role === "coordinador"

  // Siempre leemos la tarea desde la lista para reflejar cambios de estado en vivo.
  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  async function changeStatus(status: string) {
    if (selectedId == null) return
    await updateTaskStatus(selectedId, status)
  }

  async function onDrop(status: string) {
    if (dragId == null) return
    const task = tasks.find((t) => t.id === dragId)
    setDragId(null)
    if (!task || task.status === status) return
    await updateTaskStatus(dragId, status)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-balance">Gestor de tareas</h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Planificá el trabajo del equipo. Arrastrá las tarjetas entre columnas o dejá que la IA planifique.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPlannerOpen(true)} className="gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            Planificar con IA
          </Button>
          <TaskForm team={team} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TASK_STATUS_KEYS.map((statusKey) => {
          const columnTasks = tasks
            .filter((t) => t.status === statusKey)
            .sort((a, b) => a.position - b.position)
          return (
            <div
              key={statusKey}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(statusKey)}
              className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${STATUS_DOT[statusKey]}`} aria-hidden="true" />
                  <h3 className="text-sm font-medium">{TASK_STATUSES[statusKey]}</h3>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {columnTasks.length}
                </Badge>
              </div>

              <div className="flex min-h-12 flex-col gap-2">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setSelectedId(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelectedId(task.id)
                      }
                    }}
                    className="group cursor-pointer gap-2 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              />
                            }
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Opciones de la tarea</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTask(task.id)
                              }}
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {task.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <AreaBadge area={task.area} />
                      <PriorityBadge priority={task.priority} />
                      {task.createdByAI && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Sparkles className="size-3" />
                          IA
                        </Badge>
                      )}
                    </div>

                    {(task.assignee || task.dueDate) && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {task.assignee && <span className="truncate">{task.assignee}</span>}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="size-3" aria-hidden="true" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    )}
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Sin tareas</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <AiPlannerDialog open={plannerOpen} onOpenChange={setPlannerOpen} />

      <Dialog open={selectedTask != null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent>
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-balance pr-6">{selectedTask.title}</DialogTitle>
                <DialogDescription>Detalle de la tarea</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <TaskStatusBadge status={selectedTask.status} />
                  <AreaBadge area={selectedTask.area} />
                  <PriorityBadge priority={selectedTask.priority} />
                  {selectedTask.createdByAI && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Sparkles className="size-3" />
                      IA
                    </Badge>
                  )}
                </div>

                {selectedTask.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                )}

                <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Responsable:</span>
                    <span className="font-medium">{selectedTask.assignee || "Sin asignar"}</span>
                  </div>
                  {selectedTask.dueDate && (
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-muted-foreground">Fecha límite:</span>
                      <span className="font-medium">{formatDate(selectedTask.dueDate)}</span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Cambiar estado</span>
                    <div className="flex flex-wrap gap-2">
                      {TASK_STATUS_KEYS.map((statusKey) => (
                        <Button
                          key={statusKey}
                          size="sm"
                          variant={selectedTask.status === statusKey ? "default" : "secondary"}
                          onClick={() => changeStatus(statusKey)}
                        >
                          {TASK_STATUSES[statusKey]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {canManage && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => {
                      deleteTask(selectedTask.id)
                      setSelectedId(null)
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Eliminar tarea
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
