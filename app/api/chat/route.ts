import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db'
import { task, deadline, alert } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { aiModel } from '@/lib/ai'
import { searchDocuments } from '@/app/actions/documents'
import { asc, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('No autorizado', { status: 401 })
  }
  const userId = session.user.id

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: aiModel,
    stopWhen: stepCountIs(6),
    system:
      'Sos el asistente de gestión de "Fundación Aprender", una ONG que ofrece educación gratuita de testing y computación básica a la comunidad. ' +
      'Trabajás sobre tres áreas: Legal y Administración, Redes y Comunicación, y Educación. ' +
      'Ayudás al equipo a tomar decisiones y ejecutar: respondés dudas, consultás el estado de vencimientos, tareas y alertas, y podés crear tareas o registrar vencimientos cuando te lo piden. ' +
      'Usá las herramientas disponibles para basar tus respuestas en datos reales de la organización en vez de inventar. ' +
      'Cuando la pregunta sea sobre estatutos, normativas, reglamentos, procedimientos o el contenido de documentos cargados, ' +
      'usá SIEMPRE la herramienta buscarEnDocumentos y respondé citando lo que encontraste (mencioná el título del documento). ' +
      'Si no encontrás información en los documentos, decilo claramente en vez de inventar. ' +
      'Sé claro, concreto y accionable. Respondé siempre en español rioplatense.',
    messages: await convertToModelMessages(messages),
    tools: {
      buscarEnDocumentos: tool({
        description:
          'Busca información en los documentos cargados por el equipo (estatutos, normativas, reglamentos, manuales). ' +
          'Usalo para responder preguntas sobre el contenido de esos documentos.',
        inputSchema: z.object({
          consulta: z
            .string()
            .describe('La pregunta o tema a buscar en los documentos'),
          area: z
            .enum(['legal', 'comunicacion', 'educacion'])
            .optional()
            .describe('Filtrar la búsqueda a un área específica (opcional)'),
        }),
        execute: async ({ consulta, area }) => {
          const results = await searchDocuments(consulta, { area, limit: 5 })
          if (results.length === 0) {
            return {
              encontrado: false,
              mensaje: 'No se encontró información en los documentos cargados.',
            }
          }
          return {
            encontrado: true,
            fragmentos: results.map((r) => ({
              documento: r.title,
              area: r.area,
              contenido: r.content,
              relevancia: Number(r.similarity.toFixed(3)),
            })),
          }
        },
      }),
      listarVencimientos: tool({
        description:
          'Lista los vencimientos (pagos, habilitaciones, presentaciones) registrados, ordenados por fecha.',
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await db
            .select()
            .from(deadline)
            .orderBy(asc(deadline.dueDate))
          return rows.map((d) => ({
            id: d.id,
            titulo: d.title,
            area: d.category,
            estado: d.status,
            monto: d.amount,
            vence: new Date(d.dueDate).toISOString().slice(0, 10),
          }))
        },
      }),
      listarTareas: tool({
        description: 'Lista las tareas del tablero con su estado y área.',
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await db.select().from(task).orderBy(asc(task.position))
          return rows.map((t) => ({
            id: t.id,
            titulo: t.title,
            area: t.area,
            estado: t.status,
            prioridad: t.priority,
          }))
        },
      }),
      listarAlertas: tool({
        description: 'Lista las alertas activas (sin resolver).',
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await db
            .select()
            .from(alert)
            .where(eq(alert.resolved, false))
            .orderBy(desc(alert.createdAt))
          return rows.map((a) => ({
            titulo: a.title,
            mensaje: a.message,
            severidad: a.severity,
            area: a.area,
          }))
        },
      }),
      crearTarea: tool({
        description:
          'Crea una nueva tarea en el tablero. Usalo cuando el usuario pida agregar o planificar una tarea concreta.',
        inputSchema: z.object({
          titulo: z.string(),
          descripcion: z.string().optional(),
          area: z.enum(['legal', 'comunicacion', 'educacion']),
          prioridad: z.enum(['baja', 'media', 'alta']).default('media'),
        }),
        execute: async ({ titulo, descripcion, area, prioridad }) => {
          const [row] = await db
            .insert(task)
            .values({
              createdBy: userId,
              title: titulo,
              description: descripcion ?? null,
              area,
              priority: prioridad,
              createdByAI: true,
            })
            .returning()
          return { creada: true, id: row.id, titulo: row.title }
        },
      }),
      registrarVencimiento: tool({
        description:
          'Registra un nuevo vencimiento (pago, habilitación o presentación) con su fecha límite.',
        inputSchema: z.object({
          titulo: z.string(),
          descripcion: z.string().optional(),
          area: z.enum(['legal', 'comunicacion', 'educacion']).default('legal'),
          monto: z.number().optional(),
          fechaLimite: z
            .string()
            .describe('Fecha límite en formato YYYY-MM-DD'),
        }),
        execute: async ({ titulo, descripcion, area, monto, fechaLimite }) => {
          const [row] = await db
            .insert(deadline)
            .values({
              createdBy: userId,
              title: titulo,
              description: descripcion ?? null,
              category: area,
              amount: monto != null ? String(monto) : null,
              dueDate: new Date(fechaLimite),
            })
            .returning()
          return { registrado: true, id: row.id, vence: fechaLimite }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
