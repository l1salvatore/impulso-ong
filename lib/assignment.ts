import 'server-only'
import { db } from '@/lib/db'
import { memberProfile, user } from '@/lib/db/schema'
import { AREA_ROLE, AREA_KEYS, type AreaKey } from '@/lib/constants'
import { eq } from 'drizzle-orm'

function isAreaKey(value: string): value is AreaKey {
  return (AREA_KEYS as string[]).includes(value)
}

/**
 * Resuelve automáticamente el responsable de una tarea según su área,
 * siguiendo la regla área → rol (Comunicación → coordinador,
 * Educación → voluntario, Legal → admin). Busca los usuarios con ese rol y
 * elige uno al azar. Devuelve el nombre del usuario, o null si no hay ninguno.
 */
export async function resolveAssigneeForArea(
  area: string,
): Promise<string | null> {
  if (!isAreaKey(area)) return null
  const targetRole = AREA_ROLE[area]

  const candidates = await db
    .select({ name: user.name })
    .from(memberProfile)
    .leftJoin(user, eq(memberProfile.userId, user.id))
    .where(eq(memberProfile.role, targetRole))

  const named = candidates.filter((c): c is { name: string } => Boolean(c.name))
  if (named.length === 0) return null

  const pick = named[Math.floor(Math.random() * named.length)]
  return pick.name
}
