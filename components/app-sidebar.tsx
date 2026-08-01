'use client'

import type { ViewKey } from '@/components/dashboard'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  LayoutDashboard,
  Scale,
  Megaphone,
  BookOpen,
  KanbanSquare,
  Library,
} from 'lucide-react'

const NAV: {
  key: ViewKey
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    key: 'overview',
    label: 'Panel general',
    shortLabel: 'Panel',
    icon: LayoutDashboard,
  },
  { key: 'legal', label: 'Legal y Admin.', shortLabel: 'Legal', icon: Scale },
  {
    key: 'comunicacion',
    label: 'Comunicación',
    shortLabel: 'Comunic.',
    icon: Megaphone,
  },
  {
    key: 'educacion',
    label: 'Educación',
    shortLabel: 'Educ.',
    icon: BookOpen,
  },
  { key: 'tareas', label: 'Tareas', shortLabel: 'Tareas', icon: KanbanSquare },
  {
    key: 'documentos',
    label: 'Documentos',
    shortLabel: 'Docs',
    icon: Library,
  },
]

export function AppSidebar({
  view,
  onChange,
  alertCount,
}: {
  view: ViewKey
  onChange: (v: ViewKey) => void
  alertCount: number
}) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-sidebar-foreground font-serif">
              Fundación Aprender
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Gestión con IA
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Principal">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.key === 'overview' && alertCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 justify-center px-1 tabular-nums"
                  >
                    {alertCount}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
          La IA analiza tus datos y sugiere qué ejecutar en cada área.
        </p>
      </div>
    </aside>
  )
}

// Navegación horizontal para móvil / tablet (debajo del topbar).
export function MobileNav({
  view,
  onChange,
  alertCount,
}: {
  view: ViewKey
  onChange: (v: ViewKey) => void
  alertCount: number
}) {
  return (
    <nav
      className="md:hidden sticky top-16 z-10 flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2"
      aria-label="Principal"
    >
      {NAV.map((item) => {
        const Icon = item.icon
        const active = view === item.key
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.shortLabel}</span>
            {item.key === 'overview' && alertCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
              >
                {alertCount}
              </Badge>
            )}
          </button>
        )
      })}
    </nav>
  )
}
