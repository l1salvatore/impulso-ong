import { type NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { document, documentChunk } from '@/lib/db/schema'
import { getSessionUser } from '@/lib/session'
import { extractText, chunkText, embedChunks } from '@/lib/rag'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// Límite defensivo: 10 MB por archivo.
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let docId: number | null = null
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string | null)?.trim()
    const area = (formData.get('area') as string | null) ?? 'legal'

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo supera el límite de 10 MB' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Subir a Blob privado.
    const blob = await put(`documents/${Date.now()}-${file.name}`, buffer, {
      access: 'private',
      contentType: file.type || 'application/octet-stream',
    })

    // 2. Extraer texto según el tipo de archivo.
    const { text, fileType } = await extractText(buffer, file.type, file.name)

    // 3. Crear el registro del documento (estado: procesando).
    const [doc] = await db
      .insert(document)
      .values({
        createdBy: user.id,
        title: title || file.name,
        area,
        fileType,
        blobPathname: blob.pathname,
        fileSize: file.size,
        status: 'procesando',
      })
      .returning()
    docId = doc.id

    // 4. Chunking + embeddings.
    const chunks = chunkText(text)
    if (chunks.length === 0) {
      await db
        .update(document)
        .set({
          status: 'error',
          errorMessage: 'No se pudo extraer texto del archivo.',
        })
        .where(eq(document.id, doc.id))
      revalidatePath('/')
      return NextResponse.json(
        { error: 'No se pudo extraer texto del archivo' },
        { status: 422 },
      )
    }

    const embeddings = await embedChunks(chunks)

    // 5. Guardar los fragmentos con su embedding.
    await db.insert(documentChunk).values(
      chunks.map((content, i) => ({
        documentId: doc.id,
        chunkIndex: i,
        content,
        embedding: embeddings[i],
      })),
    )

    // 6. Marcar como listo.
    await db
      .update(document)
      .set({ status: 'listo', chunkCount: chunks.length })
      .where(eq(document.id, doc.id))

    revalidatePath('/')
    return NextResponse.json({ id: doc.id, chunkCount: chunks.length })
  } catch (err) {
    console.error('[v0] Error procesando documento:', err)
    const message =
      err instanceof Error && err.message.includes('credit card')
        ? 'El procesamiento con IA no está disponible: falta habilitar el AI Gateway del proyecto.'
        : 'No se pudo procesar el documento.'
    if (docId != null) {
      await db
        .update(document)
        .set({ status: 'error', errorMessage: message })
        .where(eq(document.id, docId))
      revalidatePath('/')
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
