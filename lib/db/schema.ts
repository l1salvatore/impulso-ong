import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
  customType,
} from 'drizzle-orm/pg-core'

// Tipo pgvector para embeddings (1536 dims = text-embedding-3-small).
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string) {
    return JSON.parse(value) as number[]
  },
})

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Datos compartidos por todo el equipo de la ONG. `createdBy` guarda quien
// creo el registro (auditoria), pero los datos son visibles para el equipo.

// Perfil de cada miembro: rol y area de trabajo.
export const memberProfile = pgTable('member_profile', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  role: text('role').notNull().default('voluntario'), // admin | coordinador | voluntario
  area: text('area'), // legal | comunicacion | educacion
  phone: text('phone'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Vencimientos: pagos, habilitaciones, presentaciones.
export const deadline = pgTable('deadline', {
  id: serial('id').primaryKey(),
  createdBy: text('createdBy').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull().default('legal'), // legal | comunicacion | educacion
  amount: numeric('amount'),
  dueDate: timestamp('dueDate').notNull(),
  status: text('status').notNull().default('pendiente'), // pendiente | pagado | vencido
  recurrence: text('recurrence').notNull().default('unico'), // unico | mensual | anual
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Tareas del tablero tipo Kanban.
export const task = pgTable('task', {
  id: serial('id').primaryKey(),
  createdBy: text('createdBy').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  area: text('area').notNull().default('legal'), // legal | comunicacion | educacion
  status: text('status').notNull().default('pendiente'), // pendiente | en_progreso | hecho
  priority: text('priority').notNull().default('media'), // baja | media | alta
  assignee: text('assignee'),
  dueDate: timestamp('dueDate'),
  createdByAI: boolean('createdByAI').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Documentos de la base de conocimiento (RAG): estatutos, normativas, etc.
export const document = pgTable('document', {
  id: serial('id').primaryKey(),
  createdBy: text('createdBy').notNull(),
  title: text('title').notNull(),
  area: text('area').notNull().default('legal'), // legal | comunicacion | educacion
  fileType: text('fileType').notNull(), // pdf | texto | imagen
  blobPathname: text('blobPathname').notNull(),
  fileSize: integer('fileSize'),
  status: text('status').notNull().default('procesando'), // procesando | listo | error
  chunkCount: integer('chunkCount').notNull().default(0),
  errorMessage: text('errorMessage'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Fragmentos de cada documento con su embedding para búsqueda semántica.
export const documentChunk = pgTable('document_chunk', {
  id: serial('id').primaryKey(),
  documentId: integer('documentId')
    .notNull()
    .references(() => document.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunkIndex').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Alertas generadas por el sistema / la IA.
export const alert = pgTable('alert', {
  id: serial('id').primaryKey(),
  createdBy: text('createdBy'),
  type: text('type').notNull().default('vencimiento'), // vencimiento | tarea | comunicacion | educacion
  severity: text('severity').notNull().default('media'), // baja | media | alta
  area: text('area').notNull().default('legal'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionLabel: text('actionLabel'),
  resolved: boolean('resolved').notNull().default(false),
  relatedId: integer('relatedId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
