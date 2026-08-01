'use server'

import { db } from '@/lib/db'
import { memberProfile, user } from '@/lib/db/schema'
import { getOrCreateMember, getSessionUser, requireUserId } from '@/lib/session'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getCurrentMember() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return null
  const member = await getOrCreateMember(sessionUser.id)
  return { ...member, name: sessionUser.name, email: sessionUser.email }
}

export async function getTeam() {
  await requireUserId()
  const rows = await db
    .select({
      userId: memberProfile.userId,
      role: memberProfile.role,
      area: memberProfile.area,
      name: user.name,
      email: user.email,
    })
    .from(memberProfile)
    .leftJoin(user, eq(memberProfile.userId, user.id))
  return rows
}

export async function updateMyProfile(input: { area?: string }) {
  const userId = await requireUserId()
  await db
    .update(memberProfile)
    .set({ area: input.area ?? null })
    .where(eq(memberProfile.userId, userId))
  revalidatePath('/')
}
