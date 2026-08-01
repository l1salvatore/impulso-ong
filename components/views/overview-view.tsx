'use client'

import type { ViewKey } from '@/components/dashboard'
import type { Alert, Deadline, Task } from '@/lib/types'
import { AREAS, AREA_KEYS } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertsPanel } from '@/components/alerts-panel'
import { DeadlineList } from '@/components/deadline-list'
import { daysUntil } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import {
  Scale,
  Megaphone,
  BookOpen,
  ArrowRight,
  CalendarClock,
  ListTodo,
  CircleAlert,
} from 'lucide-react'

const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  legal: Scale,
  comunicacion: Megaphone,
  educacion: BookOpen,
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: string
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
          tone,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums leading-none font-serif">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </Card>
  )
}

export function OverviewView({
  deadlines,
  tasks,
  alerts,
  onNavigate,
}: {
  deadlines: Deadline[]
  tasks: Task[]
  alerts: Alert[]
  onNavigate: (v: ViewKey) => void
}) {
  const activeAlerts = alerts.filter((a) => !a.resolved)
  const upcoming = deadlines
    .filter((d) => d.status !== 'pagado' && daysUntil(d.dueDate) <= 14)
    .slice(0, 5)
  const openTasks = tasks.filter((t) => t.status !== 'hecho')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold font-serif text-balance">
          Panel general
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Estado consolidado de la ONG. La IA prioriza qué ejecutar en cada
          área.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CircleAlert}
          label="Alertas activas"
          value={activeAlerts.length}
          tone="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={CalendarClock}
          label="Vencimientos próximos"
          value={upcoming.length}
          tone="bg-accent/15 text-accent-foreground"
        />
        <StatCard
          icon={ListTodo}
          label="Tareas abiertas"
          value={openTasks.length}
          tone="bg-primary/12 text-primary"
        />
        <StatCard
          icon={BookOpen}
          label="Tareas totales"
          value={tasks.length}
          tone="bg-chart-3/12 text-chart-3"
        />
      </div>

      <AlertsPanel alerts={alerts} />

      <div className="grid gap-6 lg:grid-cols-3">
        {AREA_KEYS.map((key) => {
          const Icon = AREA_ICONS[key]
          const areaTasks = tasks.filter(
            (t) => t.area === key && t.status !== 'hecho',
          ).length
          const areaDeadlines = deadlines.filter(
            (d) => d.category === key && d.status !== 'pagado',
          ).length
          return (
            <Card key={key} className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold font-serif">
                  {AREAS[key].label}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 text-pretty">
                {AREAS[key].description}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  <span className="font-semibold text-foreground">
                    {areaTasks}
                  </span>{' '}
                  tareas
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold text-foreground">
                    {areaDeadlines}
                  </span>{' '}
                  vencimientos
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="justify-between"
                onClick={() => onNavigate(key)}
              >
                Ver área
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Card>
          )
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold font-serif">
            Próximos vencimientos
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('legal')}
            className="gap-1.5"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <DeadlineList deadlines={upcoming} />
      </Card>
    </div>
  )
}
