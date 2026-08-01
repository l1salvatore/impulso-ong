'use client'

import { useRouter } from 'next/navigation'
import type { CurrentMember } from '@/lib/types'
import { authClient } from '@/lib/auth-client'
import { ROLES, type RoleKey } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sparkles, LogOut, Bell } from 'lucide-react'

export function Topbar({
  member,
  onOpenAssistant,
  alertCount,
}: {
  member: CurrentMember | null
  onOpenAssistant: () => void
  alertCount: number
}) {
  const router = useRouter()

  const initials =
    member?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'U'

  const roleLabel = member?.role
    ? ROLES[member.role as RoleKey] ?? member.role
    : ''

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm md:text-base font-semibold text-foreground truncate font-serif">
          Hola, {member?.name?.split(' ')[0] ?? 'equipo'}
        </h1>
        <p className="text-xs text-muted-foreground truncate">
          {alertCount > 0
            ? `Tenés ${alertCount} alerta${alertCount > 1 ? 's' : ''} que requieren atención`
            : 'Todo bajo control por ahora'}
        </p>
      </div>

      <Button
        onClick={onOpenAssistant}
        className="gap-2"
        size="sm"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Asistente IA</span>
      </Button>

      <div className="relative">
        <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        {alertCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white tabular-nums">
            {alertCount}
          </span>
        )}
        <span className="sr-only">{alertCount} alertas activas</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="text-sm font-medium">{member?.name}</span>
            <span className="text-xs font-normal text-muted-foreground truncate">
              {member?.email}
            </span>
            {roleLabel && (
              <Badge variant="secondary" className="w-fit mt-1">
                {roleLabel}
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
