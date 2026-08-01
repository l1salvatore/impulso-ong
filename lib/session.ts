import 'server-only'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { memberProfile } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function requireUserId() {
  const user = await getSessionUser()
  if (!user) throw new Error('No autorizado')
  return user.id
}

// Devuelve el perfil del miembro; lo crea si no existe (el primer usuario es admin).
export async function getOrCreateMember(userId: string) {
  const existing = await db
    .select()
    .from(memberProfile)
    .where(eq(memberProfile.userId, userId))
    .limit(1)

  if (existing.length > 0) return existing[0]

  // Si no hay ningún miembro todavía, este usuario es el admin fundador.
  const anyMember = await db.select().from(memberProfile).limit(1)
  const role = anyMember.length === 0 ? 'admin' : 'voluntario'

  const [created] = await db
    .insert(memberProfile)
    .values({ userId, role })
    .returning()

  return created
}
