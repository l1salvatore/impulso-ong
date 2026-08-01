'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocumentRow } from '@/lib/types'
import { AREAS, AREA_KEYS, type AreaKey } from '@/lib/constants'
import { deleteDocument } from '@/app/actions/documents'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AreaBadge } from '@/components/status-badges'
import { formatDate } from '@/lib/ui-helpers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  FileImage,
  FileType,
  Upload,
  Trash2,
  Download,
  Loader2,
  CircleCheck,
  CircleAlert,
  BookOpenText,
} from 'lucide-react'
import { toast } from 'sonner'

const FILE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileType,
  imagen: FileImage,
  texto: FileText,
  documento: FileText,
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'listo') {
    return (
      <Badge variant="secondary" className="gap-1">
        <CircleCheck className="size-3 text-primary" aria-hidden="true" />
        Listo
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge variant="destructive" className="gap-1">
        <CircleAlert className="size-3" aria-hidden="true" />
        Error
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      Procesando
    </Badge>
  )
}

export function DocumentsView({ documents }: { documents: DocumentRow[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<AreaKey>('legal')
  const [uploading, setUploading] = useState(false)
  const [filterArea, setFilterArea] = useState<'todas' | AreaKey>('todas')

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Elegí un archivo para subir')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name)
      formData.append('area', area)

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo subir el documento')
      }
      toast.success(
        `Documento procesado: ${data.chunkCount} fragmento(s) indexados`,
      )
      setFile(null)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: number) {
    await deleteDocument(id)
    toast.success('Documento eliminado')
    router.refresh()
  }

  const filtered =
    filterArea === 'todas'
      ? documents
      : documents.filter((d) => d.area === filterArea)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-balance">
          Base de conocimiento
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Subí estatutos, normativas o manuales (PDF, Word, RTF, texto o
          imágenes). El asistente los usa para responder consultas del equipo.
        </p>
      </div>

      {/* Uploader */}
      <Card className="p-5">
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-file">Archivo</Label>
              <Input
                id="doc-file"
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.rtf,.odt,.txt,.md,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                PDF, Word (.docx), LibreOffice (.odt), RTF, texto o imagen.
                Máximo 10 MB.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-title">Título (opcional)</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Estatuto de la fundación"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-area">Área</Label>
              <Select
                value={area}
                onValueChange={(v) => setArea(v as AreaKey)}
                disabled={uploading}
              >
                <SelectTrigger id="doc-area" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {AREAS[k].short}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={uploading} className="gap-2">
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="size-4" aria-hidden="true" />
                  Subir y procesar
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">
          Documentos cargados
          <span className="ml-2 text-muted-foreground tabular-nums">
            ({filtered.length})
          </span>
        </h3>
        <Select
          value={filterArea}
          onValueChange={(v) => setFilterArea(v as 'todas' | AreaKey)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {AREA_KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {AREAS[k].short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BookOpenText
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-medium">Todavía no hay documentos</p>
            <p className="text-sm text-muted-foreground text-pretty">
              Subí el primer documento para que el asistente pueda consultarlo.
            </p>
          </div>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((doc) => {
            const Icon = FILE_ICON[doc.fileType] ?? FileText
            return (
              <li key={doc.id}>
                <Card className="flex flex-row items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <AreaBadge area={doc.area} />
                      <StatusBadge status={doc.status} />
                      {doc.status === 'listo' && (
                        <span className="text-xs text-muted-foreground">
                          {doc.chunkCount} fragmento(s) · {formatDate(doc.createdAt)}
                        </span>
                      )}
                      {doc.status === 'error' && doc.errorMessage && (
                        <span className="text-xs text-destructive">
                          {doc.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      nativeButton={false}
                      render={
                        <a
                          href={`/api/documents/file?pathname=${encodeURIComponent(doc.blobPathname)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Descargar ${doc.title}`}
                        />
                      }
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc.id)}
                      aria-label={`Eliminar ${doc.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
