"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, X, Loader2, Bot, User, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  "¿Qué vencimientos tengo esta semana?",
  "Creá una tarea para preparar el material del próximo curso",
  "¿Qué debería priorizar en el área legal?",
]

export function AssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const busy = status === "streaming" || status === "submitted"

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  function submit(text: string) {
    if (!text.trim() || busy) return
    sendMessage({ text })
    setInput("")
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        role="dialog"
        aria-label="Asistente de IA"
      >
        <header className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Bot className="size-5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold leading-tight">Asistente de la ONG</p>
              <p className="text-xs opacity-80">Consulta datos y ejecuta acciones</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="size-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
          >
            <X className="size-4" />
            <span className="sr-only">Cerrar asistente</span>
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3 pt-2">
                <p className="text-sm text-muted-foreground text-pretty">
                  Hola, soy el asistente de la ONG. Puedo consultar vencimientos, tareas y alertas, y también
                  crear nuevas tareas o registrar vencimientos por vos.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-2.5", message.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div
                  className={cn(
                    "flex max-w-[80%] flex-col gap-1 rounded-lg px-3 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <span key={i} className="whitespace-pre-wrap text-pretty">
                          {part.text}
                        </span>
                      )
                    }
                    if (part.type.startsWith("tool-")) {
                      return (
                        <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Wrench className="size-3" />
                          Ejecutando acción...
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Pensando...
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                submit(input)
              }
            }}
            placeholder="Escribí tu consulta..."
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            <Send className="size-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </aside>
    </>
  )
}
