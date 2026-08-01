import 'server-only'
import { embed, embedMany, generateText } from 'ai'
import { embeddingModel, visionModel } from '@/lib/ai'

// --- Extracción de texto según el tipo de archivo --------------------------

/** Extrae el texto de un PDF usando pdf-parse (v2, API basada en clase). */
async function extractPdf(buffer: Buffer): Promise<string> {
  // Import dinámico: pdf-parse solo se carga en el servidor cuando se usa.
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  return result.text
}

/** Usa un modelo multimodal para transcribir/describir el contenido de una imagen. */
async function extractImage(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString('base64')
  const { text } = await generateText({
    model: visionModel,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Transcribí todo el texto visible en esta imagen de forma literal. ' +
              'Si es un documento escaneado (formulario, certificado, comprobante), ' +
              'devolvé el texto completo. Si no hay texto, describí detalladamente el contenido. ' +
              'Respondé en español, sin comentarios adicionales.',
          },
          { type: 'image', image: `data:${mimeType};base64,${base64}` },
        ],
      },
    ],
  })
  return text
}

/**
 * Extrae texto plano de un archivo según su tipo.
 * Devuelve el texto y el fileType normalizado (pdf | texto | imagen).
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ text: string; fileType: 'pdf' | 'texto' | 'imagen' }> {
  const lower = fileName.toLowerCase()

  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return { text: await extractPdf(buffer), fileType: 'pdf' }
  }

  if (mimeType.startsWith('image/')) {
    return { text: await extractImage(buffer, mimeType), fileType: 'imagen' }
  }

  // Texto plano / markdown por defecto.
  return { text: buffer.toString('utf-8'), fileType: 'texto' }
}

// --- Chunking --------------------------------------------------------------

/**
 * Divide el texto en fragmentos con solape, respetando límites de párrafo
 * cuando es posible. ~1000 caracteres por chunk con 150 de solape.
 */
export function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    // Intentar cortar en el último espacio para no partir palabras.
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end)
      if (lastSpace > start + size / 2) end = lastSpace
    }
    chunks.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = end - overlap
  }
  return chunks.filter(Boolean)
}

// --- Embeddings ------------------------------------------------------------

/** Genera embeddings para una lista de fragmentos. */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return []
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  })
  return embeddings
}

/** Genera el embedding de una única consulta. */
export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
  })
  return embedding
}
