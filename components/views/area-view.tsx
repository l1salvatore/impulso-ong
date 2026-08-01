'use client'

import type { Alert, Deadline, Task } from '@/lib/types'
import { AREAS, type AreaKey } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { DeadlineList } from '@/components/deadline-list'
import { DeadlineForm } from '@/components/deadline-form'
import { TaskForm } from '@/components/task-form'
import { AreaBadge, PriorityBadge, TaskStatusBadge } from '@/components/status-badges'
import { Scale, Megaphone, BookOpen, Sparkles } from 'lucide-react'

const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  legal: Scale,
  comunicacion: Megaphone,
  educacion: BookOpen,
}

export function AreaView({
  area,
  deadlines,
  tasks,
  alerts,
}: {
  area: AreaKey
  deadlines: Deadline[]
  tasks: Task[]
  alerts: Alert[]
}) {
  const Icon = AREA_ICONS[area]
  const meta = AREAS[area]
  const areaDeadlines = deadlines.filter((d) => d.category === area)
  const areaTasks = tasks.filter((t) => t.area === area)
  const areaAlerts = alerts.filter((a) => !a.resolved && a.area === area)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shrink-0">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-serif text-balance">
              {meta.label}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 text-pretty max-w-md">
              {meta.description}
            </p>
          </div>
        </div>
      </div>

      {areaAlerts.length > 0 && (
        <Card className="p-4 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles
              className="h-4 w-4 text-accent-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold">
              La IA sugiere para esta área
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {areaAlerts.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="font-medium text-foreground">{a.title}: </span>
                <span className="text-foreground/80">{a.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-base font-semibold font-serif">Vencimientos</h3>
            <DeadlineForm defaultArea={area} />
          </div>
          <DeadlineList deadlines={areaDeadlines} showArea={false} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-base font-semibold font-serif">Tareas</h3>
            <TaskForm defaultArea={area} />
          </div>
          {areaTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay tareas en esta área todavía.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {areaTasks.map((t) => (
                <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                      {t.title}
                    </p>
                    {t.createdByAI && (
                      <Sparkles
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-label="Creada por IA"
                      />
                    )}
                    <PriorityBadge priority={t.priority} />
                    <TaskStatusBadge status={t.status} />
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
