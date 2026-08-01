# Impulso ONG

**El sistema operativo de las organizaciones sociales.** Una plataforma que le devuelve a los equipos de las ONG lo más valioso que tienen: el tiempo para cumplir su misión.

---

## El problema

Las ONG pequeñas viven apagando incendios. La información está desparramada en chats de WhatsApp, planillas sueltas, correos y la cabeza de tres personas. Se pasan vencimientos legales, se pierden fechas de inscripción, y nadie sabe con certeza qué falta hacer esta semana. El resultado: tiempo y energía que deberían ir a la comunidad se van en tareas administrativas.

## La solución

**Impulso** centraliza toda la operación de una ONG en un solo lugar, organizada en tres áreas clave:

- **Legal y Administración** — vencimientos, pagos, habilitaciones y documentación.
- **Redes y Comunicación** — contenido, calendario de publicaciones y difusión.
- **Educación** — cursos, inscripciones y material para la comunidad.

Y en el centro de todo, un **asistente de IA** que conoce a la organización.

## Lo que hace, en concreto

- **Panel de control unificado**: vencimientos, tareas y alertas de las tres áreas, de un vistazo.
- **Tablero de tareas tipo Kanban**: pendiente → en progreso → hecho, con prioridades y responsables.
- **Gestión de vencimientos**: pagos y presentaciones con montos, fechas y recurrencia, para que nada se pase de fecha.
- **Base de conocimiento con IA (RAG)**: se suben los documentos de la ONG (estatutos, normativas, actas) y el asistente responde preguntas **citando esos documentos** — nunca inventa ni recurre a internet.
- **Creación automática de tareas y vencimientos**: al subir un documento, la IA detecta acciones y fechas y las carga solo en el módulo correspondiente.
- **Alertas inteligentes** que avisan antes de que un problema se vuelva urgente.
- **Roles y equipos**: administrador, coordinador y voluntario, cada uno con su área.

## Cómo está construido

- **Next.js 16** (App Router) y **React** con Server Actions.
- **Neon (Postgres)** con **Drizzle ORM** y búsqueda semántica vía **pgvector**.
- **Better Auth** para autenticación con email y contraseña.
- **Vercel AI Gateway** + **AI SDK** para el asistente y los embeddings.
- **Vercel Blob** para el almacenamiento de documentos.
- **Tailwind CSS** y **shadcn/ui** para la interfaz.

## El impacto

Impulso no es una herramienta más: es el copiloto que le permite a una ONG operar con la prolijidad de una empresa, sin distraerse de lo que de verdad importa. **Menos tiempo administrando, más tiempo transformando.**

---

## Desarrollo

Este repositorio está enlazado a un proyecto de [v0](https://v0.app). Cada merge a `main` se despliega automáticamente.

[Continuar en v0 →](https://v0.app/chat/projects/prj_1PkqlUwweTA20FXruc1spwyS3dye)

Para correr el proyecto localmente:

```bash
pnpm install
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.
