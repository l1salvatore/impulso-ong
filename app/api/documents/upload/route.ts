import { type NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { document, documentChunk } from '@/lib/db/schema'
import { getSessionUser } from '@/lib/session'
import { extractText, chunkText, embedChunks } from '@/lib/rag'
import { createInstancesFromDocument } from '@/lib/document-instances'
import type { AreaKey } from '@/lib/constants'
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

    // 2. Extraer texto según el tipo de archivo. Si el formato no está
    // soportado, extractText lanza un error con un mensaje claro para el usuario.
    let text: string
    let fileType: 'texto'
    try {
      const extracted = await extractText(buffer, file.type, file.name)
      text = extracted.text
      fileType = extracted.fileType
    } catch (err) {
      const errText = err instanceof Error ? err.message : ''
      return NextResponse.json(
        { error: errText || 'No se pudo leer el archivo. Formato no soportado.' },
        { status: 415 },
      )
    }

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
      const emptyMsg = 'El archivo .txt está vacío o no tiene contenido legible.'
      await db
        .update(document)
        .set({ status: 'error', errorMessage: emptyMsg })
        .where(eq(document.id, doc.id))
      revalidatePath('/')
      return NextResponse.json({ error: emptyMsg }, { status: 422 })
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

    // 7. Crear automáticamente las instancias del módulo (tareas / vencimientos)
    // que surjan del contenido del documento. Es tolerante a fallos: si algo
    // sale mal, el documento igual queda cargado.
    const created = await createInstancesFromDocument({
      text,
      area: area as AreaKey,
      userId: user.id,
      documentTitle: title || file.name,
    })

    revalidatePath('/')
    return NextResponse.json({
      id: doc.id,
      chunkCount: chunks.length,
      created,
    })
  } catch (err) {
    console.error('[v0] Error procesando documento:', err)
    const errText = err instanceof Error ? err.message : ''
    let message = 'No se pudo procesar el documento.'
    if (errText.includes('credit card')) {
      message =
        'El procesamiento con IA no está disponible: falta habilitar el AI Gateway del proyecto.'
    } else if (/rate.?limit/i.test(errText)) {
      message =
        'El servicio de IA está temporalmente saturado (límite de uso). Esperá unos minutos y volvé a intentar.'
    }
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
