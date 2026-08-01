import 'server-only'
import { embed, embedMany } from 'ai'
import { embeddingModel } from '@/lib/ai'

// --- Extracción de texto ---------------------------------------------------
// Solo soportamos texto plano (.txt / .md / .csv).

/**
 * Detecta si un buffer parece binario (muchos bytes no imprimibles),
 * para no intentar interpretarlo como texto plano.
 */
function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 1000)
  let nonPrintable = 0
  for (const byte of sample) {
    if (byte === 0) return true
    if (byte < 9 || (byte > 13 && byte < 32)) nonPrintable++
  }
  return nonPrintable / (sample.length || 1) > 0.15
}

/**
 * Extrae texto plano de un archivo. Solo admite texto (.txt / .md / .csv).
 * Devuelve el texto y el fileType normalizado.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ text: string; fileType: 'texto' }> {
  const lower = fileName.toLowerCase()

  const isTextExt =
    lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')
  if (isTextExt || mimeType.startsWith('text/') || mimeType === '') {
    if (looksBinary(buffer)) {
      throw new Error('El archivo no parece ser de texto. Subí un archivo .txt.')
    }
    return { text: buffer.toString('utf-8'), fileType: 'texto' }
  }

  throw new Error('Formato no soportado. Subí un archivo de texto (.txt).')
}

// --- Chunking --------------------------------------------------------------

/**
 * Divide el texto en fragmentos con solape, respetando límites de palabra
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
