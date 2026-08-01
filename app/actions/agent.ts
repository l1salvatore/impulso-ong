'use server'

import { db } from '@/lib/db'
import { task, deadline, alert } from '@/lib/db/schema'
import { requireUserId } from '@/lib/session'
import { AI_MODEL, AREA_KEYS } from '@/lib/constants'
import { generateObject } from 'ai'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// Error legible cuando el AI Gateway no está habilitado (falta tarjeta / crédito).
class AIUnavailableError extends Error {
  constructor() {
    super(
      'El asistente de IA no está disponible: falta habilitar el AI Gateway del proyecto (agregar una tarjeta para desbloquear el crédito gratuito).',
    )
    this.name = 'AIUnavailableError'
  }
}

function isGatewayCreditError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('credit card') ||
    msg.includes('customer_verification_required') ||
    msg.includes('402')
  )
}

const planSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().describe('Título breve y accionable de la tarea'),
        description: z
          .string()
          .describe('Qué hay que ejecutar concretamente, en 1-2 frases'),
        area: z
          .enum(['legal', 'comunicacion', 'educacion'])
          .describe('Área de la ONG a la que pertenece'),
        priority: z.enum(['baja', 'media', 'alta']),
      }),
    )
    .min(1)
    .max(8),
  summary: z.string().describe('Resumen breve del plan generado'),
})

// La IA descompone un objetivo en tareas concretas y las crea en el tablero.
export async function planTasksFromGoal(goal: string) {
  const userId = await requireUserId()

  let object: z.infer<typeof planSchema>
  try {
    ;({ object } = await generateObject({
      model: AI_MODEL,
      schema: planSchema,
      system:
        'Sos el asistente de gestión de una ONG que ofrece educación gratuita de testing y computación básica a la comunidad. ' +
        'La organización trabaja en tres áreas: Legal y Administración (legal), Redes y Comunicación (comunicacion) y Educación (educacion). ' +
        'Descomponé el objetivo del usuario en tareas concretas, accionables y ejecutables por voluntarios. ' +
        'Asigná cada tarea al área correcta y una prioridad realista. Respondé siempre en español.',
      prompt: `Objetivo a planificar: ${goal}`,
    }))
  } catch (err) {
    if (isGatewayCreditError(err)) throw new AIUnavailableError()
    throw err
  }

  const values = object.tasks.map((t, i) => ({
    createdBy: userId,
    title: t.title,
    description: t.description,
    area: AREA_KEYS.includes(t.area) ? t.area : 'legal',
    priority: t.priority,
    createdByAI: true,
    position: i,
  }))

  await db.insert(task).values(values)

  revalidatePath('/')
  return { count: values.length, summary: object.summary }
}

const insightSchema = z.object({
  insights: z
    .array(
      z.object({
        area: z.enum(['legal', 'comunicacion', 'educacion']),
        severity: z.enum(['baja', 'media', 'alta']),
        title: z.string(),
        message: z
          .string()
          .describe('Recomendación concreta de qué ejecutar'),
      }),
    )
    .max(5),
})

// La IA analiza el estado actual y genera recomendaciones proactivas como alertas.
export async function generateRecommendations() {
  const userId = await requireUserId()

  const [tasks, deadlines] = await Promise.all([
    db.select().from(task),
    db.select().from(deadline),
  ])

  const context = {
    tareas: tasks.map((t) => ({
      titulo: t.title,
      area: t.area,
      estado: t.status,
      prioridad: t.priority,
    })),
    vencimientos: deadlines.map((d) => ({
      titulo: d.title,
      area: d.category,
      estado: d.status,
      vence: new Date(d.dueDate).toISOString().slice(0, 10),
    })),
  }

  let object: z.infer<typeof insightSchema>
  try {
    ;({ object } = await generateObject({
      model: AI_MODEL,
      schema: insightSchema,
      system:
        'Sos el asistente de gestión de una ONG de educación gratuita. Analizás el estado de tareas y vencimientos ' +
        'y generás recomendaciones proactivas y accionables para el equipo. Sé concreto: decí qué ejecutar. Respondé en español. ' +
        'Si todo está bajo control, devolvé una lista vacía o una sola recomendación de mantenimiento.',
      prompt: `Estado actual de la ONG (JSON):\n${JSON.stringify(context, null, 2)}\n\nGenerá hasta 5 recomendaciones priorizadas.`,
    }))
  } catch (err) {
    if (isGatewayCreditError(err)) throw new AIUnavailableError()
    throw err
  }

  if (object.insights.length > 0) {
    await db.insert(alert).values(
      object.insights.map((i) => ({
        createdBy: userId,
        type: 'recomendacion',
        severity: i.severity,
        area: i.area,
        title: i.title,
        message: i.message,
        actionLabel: 'Descartar',
      })),
    )
  }

  revalidatePath('/')
  return { count: object.insights.length }
}
