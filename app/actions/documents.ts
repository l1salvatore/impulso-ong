'use server'

import { db } from '@/lib/db'
import { document, documentChunk } from '@/lib/db/schema'
import { requireUserId } from '@/lib/session'
import { embedQuery } from '@/lib/rag'
import { del } from '@vercel/blob'
import { desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getDocuments() {
  await requireUserId()
  return db.select().from(document).orderBy(desc(document.createdAt))
}

export async function deleteDocument(id: number) {
  await requireUserId()
  const [doc] = await db.select().from(document).where(eq(document.id, id))
  if (!doc) return
  // Borrar el archivo de Blob (los chunks caen por ON DELETE CASCADE).
  try {
    await del(doc.blobPathname)
  } catch (err) {
    console.error('[v0] Error borrando blob:', err)
  }
  await db.delete(document).where(eq(document.id, id))
  revalidatePath('/')
}

/**
 * Búsqueda semántica sobre los fragmentos de documentos.
 * Devuelve los `limit` fragmentos más cercanos a la consulta (opcionalmente
 * filtrados por área) con su similitud coseno.
 */
export async function searchDocuments(
  query: string,
  opts: { area?: string; limit?: number } = {},
) {
  await requireUserId()
  const limit = opts.limit ?? 5
  const queryEmbedding = await embedQuery(query)
  const vectorLiteral = `[${queryEmbedding.join(',')}]`

  // Distancia coseno (<=>); similitud = 1 - distancia.
  const rows = await db
    .select({
      content: documentChunk.content,
      documentId: documentChunk.documentId,
      title: document.title,
      area: document.area,
      fileType: document.fileType,
      similarity: sql<number>`1 - (${documentChunk.embedding} <=> ${vectorLiteral}::vector)`,
    })
    .from(documentChunk)
    .innerJoin(document, eq(documentChunk.documentId, document.id))
    .where(
      opts.area
        ? sql`${document.area} = ${opts.area} AND ${document.status} = 'listo'`
        : sql`${document.status} = 'listo'`,
    )
    .orderBy(sql`${documentChunk.embedding} <=> ${vectorLiteral}::vector`)
    .limit(limit)

  return rows
}
