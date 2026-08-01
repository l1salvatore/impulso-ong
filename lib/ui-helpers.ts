export function daysUntil(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(date: Date | string) {
  // timeZone: 'UTC' garantiza el mismo resultado en servidor y cliente,
  // evitando errores de hidratación por diferencia de zona horaria.
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function relativeDue(date: Date | string) {
  const diff = daysUntil(date)
  if (diff < 0) return `Vencido hace ${Math.abs(diff)} día(s)`
  if (diff === 0) return 'Vence hoy'
  if (diff === 1) return 'Vence mañana'
  return `Vence en ${diff} días`
}

export const severityClasses: Record<string, string> = {
  alta: 'bg-destructive/10 text-destructive border-destructive/20',
  media: 'bg-accent/15 text-accent-foreground border-accent/30',
  baja: 'bg-secondary text-secondary-foreground border-border',
}

export const areaAccent: Record<string, string> = {
  legal: 'text-chart-3',
  comunicacion: 'text-chart-4',
  educacion: 'text-primary',
}
