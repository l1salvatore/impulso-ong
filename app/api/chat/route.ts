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

/** Extrae el texto plano del último mensaje del usuario. */
function extractLastUserText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUser) return ''
  return lastUser.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .trim()
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response('No autorizado', { status: 401 })
  }
  const userId = session.user.id

  const { messages }: { messages: UIMessage[] } = await req.json()

  // --- RAG siempre activo -------------------------------------------------
  // Recuperamos los fragmentos de documentos más relevantes para la última
  // consulta del usuario y los inyectamos en el prompt. Así el asistente
  // SIEMPRE tiene el contenido a la vista (no depende de decidir buscar) y
  // hacemos una sola llamada al modelo en lugar de un ida y vuelta de tool,
  // lo que además reduce los cortes por rate limit del plan gratuito.
  const lastUserText = extractLastUserText(messages)
  let documentContext = ''
  if (lastUserText) {
    try {
      const found = await searchDocuments(lastUserText, { limit: 6 })
      if (found.length > 0) {
        documentContext = found
          .map(
            (r, i) =>
              `[Documento ${i + 1}: "${r.title}" (área: ${r.area})]\n${r.content}`,
          )
          .join('\n\n')
      }
    } catch (err) {
      console.error('[v0] Error recuperando documentos para el chat:', err)
    }
  }

  const result = streamText({
    model: aiModel,
    stopWhen: stepCountIs(6),
    system:
      'Sos el asistente de gestión de "Fundación Aprender", una ONG que ofrece educación gratuita de testing y computación básica a la comunidad. ' +
      'Trabajás sobre tres áreas: Legal y Administración, Redes y Comunicación, y Educación. ' +
      'Ayudás al equipo a consultar el estado de vencimientos, tareas y alertas, y podés crear tareas o registrar vencimientos cuando te lo piden.\n\n' +
      'REGLA FUNDAMENTAL: respondé ÚNICAMENTE con información que provenga de los documentos cargados (la sección "DOCUMENTOS RELEVANTES" de abajo) ' +
      'o de los datos de la organización que obtengas con las herramientas (vencimientos, tareas, alertas). ' +
      'NO uses conocimiento general ni inventes datos que no estén en esas fuentes. ' +
      'Si la respuesta no está en los documentos ni en los datos de la organización, decí explícitamente: ' +
      '"No encontré esa información en los documentos cargados." y ofrecé, si corresponde, que el usuario suba el documento pertinente.\n' +
      'Cuando uses un documento, citá su título entre comillas. ' +
      'Sé claro, concreto y accionable. Respondé siempre en español rioplatense.\n\n' +
      (documentContext
        ? `DOCUMENTOS RELEVANTES para la consulta actual:\n${documentContext}`
        : 'DOCUMENTOS RELEVANTES: no se encontraron fragmentos de documentos relacionados con la consulta actual. ' +
          'Si la pregunta es sobre el contenido de un documento, respondé que no lo encontraste en los documentos cargados.'),
    messages: await convertToModelMessages(messages),
    tools: {
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

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      const text = error instanceof Error ? error.message : String(error)
      console.error('[v0] Error en el chat:', text)
      if (/rate.?limit/i.test(text)) {
        return 'El servicio de IA está temporalmente saturado (límite de uso del plan gratuito). Esperá unos segundos y volvé a intentar.'
      }
      return 'Ocurrió un error procesando tu consulta. Intentá de nuevo.'
    },
  })
}
