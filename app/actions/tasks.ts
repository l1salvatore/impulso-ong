'use server'

import { db } from '@/lib/db'
import { task } from '@/lib/db/schema'
import { requireUserId } from '@/lib/session'
import { resolveAssigneeForArea } from '@/lib/assignment'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type TaskInput = {
  title: string
  description?: string
  area: string
  priority?: string
  assignee?: string
  dueDate?: string | null
}

export async function getTasks() {
  await requireUserId()
  return db
    .select()
    .from(task)
    .orderBy(asc(task.position), asc(task.createdAt))
}

export async function createTask(input: TaskInput) {
  const userId = await requireUserId()
  // Si no se eligió un responsable manualmente, se asigna automáticamente
  // según el área (Comunicación → coordinador, Educación → voluntario,
  // Legal → admin).
  const assignee =
    input.assignee && input.assignee.trim()
      ? input.assignee
      : await resolveAssigneeForArea(input.area)
  const [row] = await db
    .insert(task)
    .values({
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      area: input.area,
      priority: input.priority ?? 'media',
      assignee: assignee ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    })
    .returning()
  revalidatePath('/')
  return row
}

export async function updateTaskStatus(id: number, status: string) {
  await requireUserId()
  await db.update(task).set({ status }).where(eq(task.id, id))
  revalidatePath('/')
}

export async function updateTask(id: number, input: Partial<TaskInput>) {
  await requireUserId()
  await db
    .update(task)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.area !== undefined ? { area: input.area } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.assignee !== undefined ? { assignee: input.assignee } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
        : {}),
    })
    .where(eq(task.id, id))
  revalidatePath('/')
}

export async function deleteTask(id: number) {
  await requireUserId()
  await db.delete(task).where(eq(task.id, id))
  revalidatePath('/')
}
