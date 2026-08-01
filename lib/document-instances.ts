import 'server-only'
import { generateObject } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db'
import { task, deadline } from '@/lib/db/schema'
import { aiModel } from '@/lib/ai'
import { AREAS, type AreaKey } from '@/lib/constants'

// Esquema de lo que la IA extrae del documento.
const extractionSchema = z.object({
  tareas: z
    .array(
      z.object({
        titulo: z.string().describe('Título breve y accionable de la tarea'),
        descripcion: z
          .string()
          .describe('Detalle de qué hay que hacer, según el documento'),
        prioridad: z.enum(['baja', 'media', 'alta']),
      }),
    )
    .describe('Acciones concretas o pendientes que surgen del documento'),
  vencimientos: z
    .array(
      z.object({
        titulo: z.string().describe('Qué vence (pago, presentación, trámite)'),
        descripcion: z
          .string()
          .nullable()
          .describe('Detalle del vencimiento, o null'),
        monto: z
          .number()
          .nullable()
          .describe('Monto en pesos si aplica, si no null'),
        fechaLimite: z
          .string()
          .describe('Fecha límite en formato YYYY-MM-DD'),
        recurrencia: z.enum(['unico', 'mensual', 'anual']),
      }),
    )
    .describe(
      'Fechas límite explícitas del documento: pagos, presentaciones, habilitaciones. Solo con fecha concreta.',
    ),
})

export type CreatedInstances = {
  tareas: number
  vencimientos: number
}

/**
 * Analiza el texto de un documento y crea automáticamente las instancias
 * (tareas y vencimientos) que correspondan en el área indicada. Las tareas
 * quedan marcadas como generadas por IA. Devuelve cuántas creó.
 *
 * Es tolerante a fallos: si la IA no devuelve nada útil o hay un error,
 * simplemente no crea instancias (no interrumpe la carga del documento).
 */
export async function createInstancesFromDocument({
  text,
  area,
  userId,
  documentTitle,
}: {
  text: string
  area: AreaKey
  userId: string
  documentTitle: string
}): Promise<CreatedInstances> {
  const created: CreatedInstances = { tareas: 0, vencimientos: 0 }

  // Documentos muy cortos rara vez tienen acciones; igual lo intentamos con
  // un recorte para acotar tokens.
  const excerpt = text.slice(0, 8000)
  const areaLabel = AREAS[area].short
  const today = new Date().toISOString().slice(0, 10)

  let extraction: z.infer<typeof extractionSchema>
  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: extractionSchema,
      system:
        'Sos el asistente de gestión de "Fundación Aprender", una ONG. ' +
        `Estás procesando un documento del área de ${areaLabel}. ` +
        'Tu tarea es leer el documento y extraer SOLO acciones concretas y ' +
        'fechas límite reales que aparezcan en el texto. ' +
        'No inventes tareas ni vencimientos: si el documento es puramente ' +
        'informativo (un estatuto, una descripción, notas), devolvé listas vacías. ' +
        `La fecha de hoy es ${today}. Interpretá fechas relativas respecto a hoy. ` +
        'Respondé en español rioplatense.',
      prompt:
        `Título del documento: "${documentTitle}"\n\n` +
        `Contenido:\n${excerpt}\n\n` +
        'Extraé las tareas accionables y los vencimientos con fecha concreta.',
    })
    extraction = object
  } catch (err) {
    console.error('[v0] No se pudieron extraer instancias del documento:', err)
    return created
  }

  // Insertar tareas.
  const validTasks = extraction.tareas.filter((t) => t.titulo?.trim())
  if (validTasks.length > 0) {
    await db.insert(task).values(
      validTasks.map((t) => ({
        createdBy: userId,
        title: t.titulo.trim(),
        description: t.descripcion?.trim() || `Generada desde "${documentTitle}"`,
        area,
        priority: t.prioridad,
        createdByAI: true,
      })),
    )
    created.tareas = validTasks.length
  }

  // Insertar vencimientos (solo los que tienen una fecha válida).
  const validDeadlines = extraction.vencimientos
    .map((d) => ({ ...d, parsed: new Date(d.fechaLimite) }))
    .filter((d) => d.titulo?.trim() && !Number.isNaN(d.parsed.getTime()))
  if (validDeadlines.length > 0) {
    await db.insert(deadline).values(
      validDeadlines.map((d) => ({
        createdBy: userId,
        title: d.titulo.trim(),
        description: d.descripcion?.trim() || `Detectado en "${documentTitle}"`,
        category: area,
        amount: d.monto != null ? String(d.monto) : null,
        dueDate: d.parsed,
        recurrence: d.recurrencia,
      })),
    )
    created.vencimientos = validDeadlines.length
  }

  return created
}
