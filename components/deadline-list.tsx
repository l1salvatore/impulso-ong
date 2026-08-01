'use client'

import { useTransition } from 'react'
import type { Deadline } from '@/lib/types'
import { setDeadlineStatus, deleteDeadline } from '@/app/actions/deadlines'
import { AreaBadge, DeadlineStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { daysUntil, formatDate, relativeDue } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { CalendarClock, Check, Trash2 } from 'lucide-react'

export function DeadlineList({
  deadlines,
  showArea = true,
}: {
  deadlines: Deadline[]
  showArea?: boolean
}) {
  const [pending, startTransition] = useTransition()

  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <CalendarClock
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          No hay vencimientos registrados todavía.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {deadlines.map((d) => {
        const diff = daysUntil(d.dueDate)
        const urgent = d.status !== 'pagado' && diff <= 3
        return (
          <li
            key={d.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                d.status === 'pagado'
                  ? 'bg-primary'
                  : urgent
                    ? 'bg-destructive'
                    : 'bg-accent',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">
                  {d.title}
                </p>
                {showArea && <AreaBadge area={d.category} />}
                <DeadlineStatusBadge status={d.status} />
              </div>
              <p
                className={cn(
                  'text-xs mt-0.5',
                  urgent ? 'text-destructive font-medium' : 'text-muted-foreground',
                )}
              >
                {formatDate(d.dueDate)} · {relativeDue(d.dueDate)}
                {d.amount ? ` · $${d.amount}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {d.status !== 'pagado' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await setDeadlineStatus(d.id, 'pagado')
                    })
                  }
                  aria-label="Marcar como resuelto"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteDeadline(d.id)
                  })
                }
                aria-label="Eliminar vencimiento"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
