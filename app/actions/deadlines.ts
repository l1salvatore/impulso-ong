'use server'

import { db } from '@/lib/db'
import { deadline, alert } from '@/lib/db/schema'
import { requireUserId } from '@/lib/session'
import { and, asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type DeadlineInput = {
  title: string
  description?: string
  category: string
  amount?: number | null
  dueDate: string // ISO
  recurrence?: string
}

export async function getDeadlines() {
  await requireUserId()
  return db.select().from(deadline).orderBy(asc(deadline.dueDate))
}

export async function createDeadline(input: DeadlineInput) {
  const userId = await requireUserId()
  const [row] = await db
    .insert(deadline)
    .values({
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      amount: input.amount != null ? String(input.amount) : null,
      dueDate: new Date(input.dueDate),
      recurrence: input.recurrence ?? 'unico',
    })
    .returning()
  revalidatePath('/')
  return row
}

export async function setDeadlineStatus(id: number, status: string) {
  await requireUserId()
  await db.update(deadline).set({ status }).where(eq(deadline.id, id))
  // Resolver alertas ligadas a este vencimiento.
  if (status === 'pagado') {
    await db
      .update(alert)
      .set({ resolved: true })
      .where(and(eq(alert.type, 'vencimiento'), eq(alert.relatedId, id)))
  }
  revalidatePath('/')
}

export async function deleteDeadline(id: number) {
  await requireUserId()
  await db.delete(deadline).where(eq(deadline.id, id))
  await db
    .delete(alert)
    .where(and(eq(alert.type, 'vencimiento'), eq(alert.relatedId, id)))
  revalidatePath('/')
}

// Motor de alertas: escanea vencimientos y crea/actualiza alertas.
// Se considera "por vencer" si faltan <= 7 días. Vencido si la fecha pasó.
export async function scanDeadlinesForAlerts() {
  const userId = await requireUserId()
  const rows = await db.select().from(deadline)
  const now = new Date()
  const existing = await db
    .select()
    .from(alert)
    .where(eq(alert.type, 'vencimiento'))

  const existingByRelated = new Map(
    existing.filter((a) => a.relatedId != null).map((a) => [a.relatedId, a]),
  )

  let created = 0

  for (const d of rows) {
    if (d.status === 'pagado') continue
    const due = new Date(d.dueDate)
    const diffDays = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    const isOverdue = diffDays < 0
    const isSoon = diffDays >= 0 && diffDays <= 7

    if (!isOverdue && !isSoon) continue

    // Marcar como vencido si corresponde.
    if (isOverdue && d.status !== 'vencido') {
      await db
        .update(deadline)
        .set({ status: 'vencido' })
        .where(eq(deadline.id, d.id))
    }

    const already = existingByRelated.get(d.id)
    if (already && !already.resolved) continue

    const severity = isOverdue ? 'alta' : diffDays <= 2 ? 'alta' : 'media'
    const amountText = d.amount ? ` (monto: $${d.amount})` : ''
    const title = isOverdue
      ? `Vencido: ${d.title}`
      : `Por vencer: ${d.title}`
    const message = isOverdue
      ? `El vencimiento "${d.title}" está atrasado por ${Math.abs(diffDays)} día(s)${amountText}. Regularizá la situación cuanto antes.`
      : `El vencimiento "${d.title}" vence en ${diffDays} día(s)${amountText}. Preparate para ejecutarlo.`

    if (already && already.resolved) {
      await db
        .update(alert)
        .set({ severity, title, message, resolved: false, createdAt: now })
        .where(eq(alert.id, already.id))
    } else {
      await db.insert(alert).values({
        createdBy: userId,
        type: 'vencimiento',
        severity,
        area: d.category,
        title,
        message,
        actionLabel: 'Marcar como resuelto',
        relatedId: d.id,
      })
      created++
    }
  }

  revalidatePath('/')
  return { created }
}
