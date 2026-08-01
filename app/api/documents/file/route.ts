import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { getSessionUser } from '@/lib/session'

// Sirve archivos privados de Blob solo a usuarios autenticados.
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname) {
    return NextResponse.json({ error: 'Falta el parámetro pathname' }, { status: 400 })
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('No encontrado', { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (err) {
    console.error('[v0] Error sirviendo archivo:', err)
    return NextResponse.json({ error: 'No se pudo servir el archivo' }, { status: 500 })
  }
}
