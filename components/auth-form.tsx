'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { GraduationCap } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Ocurrió un error. Intentá de nuevo.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold tracking-tight text-foreground text-balance">
              Fundación Aprender
            </p>
            <p className="text-sm text-muted-foreground">
              Gestión asistida por IA
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isSignUp ? 'Crear cuenta' : 'Bienvenido de nuevo'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp
                ? 'Registrate para unirte al equipo'
                : 'Ingresá para gestionar la ONG'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? 'Por favor esperá...'
                : isSignUp
                  ? 'Crear cuenta'
                  : 'Ingresar'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {isSignUp ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Ingresar' : 'Registrate'}
            </Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
