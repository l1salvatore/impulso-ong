import 'server-only'
import { embed, embedMany, generateText } from 'ai'
import { embeddingModel, visionModel } from '@/lib/ai'

// --- Extracción de texto según el tipo de archivo --------------------------

/** Extrae el texto de un PDF usando pdf-parse (v2, API basada en clase). */
async function extractPdf(buffer: Buffer): Promise<string> {
  // 1. Intento rápido: extraer la capa de texto embebida.
  let embedded = ''
  try {
    // Import dinámico: pdf-parse solo se carga en el servidor cuando se usa.
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    embedded = (result.text ?? '').trim()
  } catch (err) {
    console.error('[v0] pdf-parse falló, se intentará OCR:', err)
  }

  // Si el PDF tiene una capa de texto útil, la usamos.
  if (embedded.length >= 40) return embedded

  // 2. Fallback OCR: PDF escaneado (imágenes sin texto). Se lo pasamos al
  // modelo multimodal para que transcriba su contenido.
  console.log('[v0] PDF sin texto embebido, usando OCR con el modelo de visión')
  return extractPdfWithVision(buffer)
}

/**
 * Transcribe un PDF escaneado: renderiza cada página a imagen PNG y usa el
 * modelo multimodal para hacer OCR. Es más confiable que pasar el PDF crudo.
 * Se limita a 15 páginas para acotar tiempo y costo.
 */
async function extractPdfWithVision(buffer: Buffer): Promise<string> {
  const { pdf } = await import('pdf-to-img')
  const doc = await pdf(new Uint8Array(buffer), { scale: 2 })

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'file'; data: string; mediaType: string }
  > = [
    {
      type: 'text',
      text:
        'Transcribí literalmente todo el texto visible en las siguientes imágenes ' +
        '(páginas de un documento escaneado: estatuto, normativa, comprobante o similar). ' +
        'Devolvé el texto completo y ordenado, sin comentarios adicionales. Respondé en español.',
    },
  ]

  let pages = 0
  for await (const page of doc) {
    if (pages >= 15) break
    content.push({
      type: 'file',
      data: `data:image/png;base64,${page.toString('base64')}`,
      mediaType: 'image/png',
    })
    pages++
  }

  const { text } = await generateText({
    model: visionModel,
    messages: [{ role: 'user', content }],
  })
  return text.trim()
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

/** Extrae el texto de un documento Word (.docx) usando mammoth. */
async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return value.trim()
}

/** Extrae el texto de un documento OpenDocument (.odt) de LibreOffice. */
async function extractOdt(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const contentFile = zip.file('content.xml')
  if (!contentFile) {
    throw new Error('El archivo .odt no tiene contenido legible.')
  }
  const xml = await contentFile.async('string')
  // Insertar saltos por párrafo/salto y luego quitar todas las etiquetas XML.
  const text = xml
    .replace(/<text:p[^>]*>/g, '\n')
    .replace(/<text:line-break[^>]*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
  // Decodificar entidades XML básicas.
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Quita los control words de un archivo RTF y devuelve el texto plano. */
function extractRtf(buffer: Buffer): string {
  let rtf = buffer.toString('utf-8')
  // 1. Eliminar grupos de encabezado que no son contenido (tablas de fuentes,
  // colores, estilos, metadatos), incluido lo que hay dentro.
  rtf = rtf.replace(
    /\{\\(?:fonttbl|colortbl|stylesheet|info|\*\\[a-zA-Z]+)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    '',
  )
  // 2. Saltos de párrafo y escapes unicode / hex.
  rtf = rtf.replace(/\\par[d]?\b/g, '\n')
  rtf = rtf.replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(Number(n) & 0xffff))
  rtf = rtf.replace(/\\'[0-9a-fA-F]{2}/g, ' ')
  // 3. Resto de control words y llaves de grupo.
  rtf = rtf.replace(/\\[a-zA-Z]+-?\d* ?/g, '')
  rtf = rtf.replace(/[{}]/g, '')
  return rtf.replace(/\n{3,}/g, '\n\n').trim()
}

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
 * Extrae texto plano de un archivo según su tipo.
 * Devuelve el texto y el fileType normalizado (pdf | texto | imagen | documento).
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ text: string; fileType: 'pdf' | 'texto' | 'imagen' | 'documento' }> {
  const lower = fileName.toLowerCase()

  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return { text: await extractPdf(buffer), fileType: 'pdf' }
  }

  if (mimeType.startsWith('image/')) {
    return { text: await extractImage(buffer, mimeType), fileType: 'imagen' }
  }

  // Word (.docx)
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    return { text: await extractDocx(buffer), fileType: 'documento' }
  }

  // RTF
  if (mimeType === 'application/rtf' || mimeType === 'text/rtf' || lower.endsWith('.rtf')) {
    return { text: extractRtf(buffer), fileType: 'documento' }
  }

  // OpenDocument Text (.odt) de LibreOffice / OpenOffice.
  if (
    mimeType === 'application/vnd.oasis.opendocument.text' ||
    lower.endsWith('.odt')
  ) {
    return { text: await extractOdt(buffer), fileType: 'documento' }
  }

  // .doc antiguo (binario) no está soportado: mejor avisar que fallar silencioso.
  if (lower.endsWith('.doc')) {
    throw new Error(
      'Los archivos .doc antiguos no están soportados. Guardá el documento como .docx o PDF.',
    )
  }

  // Texto plano / markdown por defecto.
  if (looksBinary(buffer)) {
    throw new Error(
      'Formato de archivo no soportado. Subí un PDF, Word (.docx), texto o una imagen.',
    )
  }
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
