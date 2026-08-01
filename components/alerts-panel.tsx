'use client'

import { useState, useTransition } from 'react'
import type { Alert } from '@/lib/types'
import { resolveAlert } from '@/app/actions/alerts'
import {
  scanDeadlinesForAlerts,
} from '@/app/actions/deadlines'
import { generateRecommendations } from '@/app/actions/agent'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AreaBadge } from '@/components/status-badges'
import { cn } from '@/lib/utils'
import { severityClasses } from '@/lib/ui-helpers'
import {
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Check,
  BellOff,
} from 'lucide-react'
import { toast } from 'sonner'

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const active = alerts.filter((a) => !a.resolved)
  const [pending, startTransition] = useTransition()
  const [scanning, setScanning] = useState(false)
  const [thinking, setThinking] = useState(false)

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await scanDeadlinesForAlerts()
      toast.success(
        res.created > 0
          ? `Se generaron ${res.created} alerta(s) de vencimiento`
          : 'No hay vencimientos próximos. Todo en orden.',
      )
    } catch {
      toast.error('No se pudo escanear los vencimientos')
    } finally {
      setScanning(false)
    }
  }

  const handleRecommend = async () => {
    setThinking(true)
    try {
      const res = await generateRecommendations()
      toast.success(
        res.count > 0
          ? `La IA generó ${res.count} recomendación(es)`
          : 'La IA no encontró nada urgente por ahora',
      )
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('AI Gateway')
          ? err.message
          : 'No se pudo generar recomendaciones'
      toast.error(msg)
    } finally {
      setThinking(false)
    }
  }

  const handleResolve = (id: number) => {
    startTransition(async () => {
      await resolveAlert(id)
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-5 w-5 text-accent-foreground"
            aria-hidden="true"
          />
          <h2 className="text-base font-semibold font-serif">
            Alertas y recomendaciones
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={scanning}
          className="gap-2"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', scanning && 'animate-spin')}
            aria-hidden="true"
          />
          Escanear vencimientos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecommend}
          disabled={thinking}
          className="gap-2"
        >
          <Sparkles
            className={cn('h-3.5 w-3.5', thinking && 'animate-pulse')}
            aria-hidden="true"
          />
          {thinking ? 'Analizando...' : 'Pedir análisis IA'}
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-pretty">
            No hay alertas activas. Ejecutá un escaneo o pedile un análisis a la
            IA.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((a) => (
            <li
              key={a.id}
              className={cn(
                'rounded-lg border p-3.5',
                severityClasses[a.severity] ?? severityClasses.media,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-foreground">
                      {a.title}
                    </p>
                    <AreaBadge area={a.area} />
                    {a.type === 'recomendacion' && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        IA
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed text-pretty">
                    {a.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => handleResolve(a.id)}
                  disabled={pending}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {a.actionLabel ?? 'Resolver'}
                  </span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
