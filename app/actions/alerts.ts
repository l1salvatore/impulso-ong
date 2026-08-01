'use server'

import { db } from '@/lib/db'
import { alert } from '@/lib/db/schema'
import { requireUserId } from '@/lib/session'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getAlerts() {
  await requireUserId()
  return db.select().from(alert).orderBy(desc(alert.createdAt))
}

export async function resolveAlert(id: number) {
  await requireUserId()
  await db.update(alert).set({ resolved: true }).where(eq(alert.id, id))
  revalidatePath('/')
}

export async function reopenAlert(id: number) {
  await requireUserId()
  await db.update(alert).set({ resolved: false }).where(eq(alert.id, id))
  revalidatePath('/')
}
