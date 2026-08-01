import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  AREAS,
  PRIORITIES,
  TASK_STATUSES,
  DEADLINE_STATUSES,
  type AreaKey,
} from '@/lib/constants'

export function AreaBadge({ area }: { area: string }) {
  const label = AREAS[area as AreaKey]?.short ?? area
  const map: Record<string, string> = {
    legal: 'bg-chart-3/12 text-chart-3 border-chart-3/25',
    comunicacion: 'bg-chart-4/12 text-chart-4 border-chart-4/25',
    educacion: 'bg-primary/12 text-primary border-primary/25',
  }
  return (
    <Badge variant="outline" className={cn('font-medium', map[area])}>
      {label}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const label = PRIORITIES[priority as keyof typeof PRIORITIES] ?? priority
  const map: Record<string, string> = {
    alta: 'bg-destructive/10 text-destructive border-destructive/20',
    media: 'bg-accent/15 text-accent-foreground border-accent/30',
    baja: 'bg-secondary text-secondary-foreground border-border',
  }
  return (
    <Badge variant="outline" className={cn('font-medium', map[priority])}>
      {label}
    </Badge>
  )
}

export function TaskStatusBadge({ status }: { status: string }) {
  const label = TASK_STATUSES[status as keyof typeof TASK_STATUSES] ?? status
  return <Badge variant="secondary">{label}</Badge>
}

export function DeadlineStatusBadge({ status }: { status: string }) {
  const label =
    DEADLINE_STATUSES[status as keyof typeof DEADLINE_STATUSES] ?? status
  const map: Record<string, string> = {
    pendiente: 'bg-secondary text-secondary-foreground border-border',
    vencido: 'bg-destructive/10 text-destructive border-destructive/20',
    pagado: 'bg-primary/12 text-primary border-primary/25',
  }
  return (
    <Badge variant="outline" className={cn('font-medium', map[status])}>
      {label}
    </Badge>
  )
}
