export const AREAS = {
  legal: {
    label: 'Legal y Administración',
    short: 'Legal',
    description: 'Vencimientos, pagos, habilitaciones y documentación.',
  },
  comunicacion: {
    label: 'Redes y Comunicación',
    short: 'Comunicación',
    description: 'Contenido, calendario de publicaciones y difusión.',
  },
  educacion: {
    label: 'Educación',
    short: 'Educación',
    description: 'Cursos, inscripciones y material para la comunidad.',
  },
} as const

export type AreaKey = keyof typeof AREAS

export const AREA_KEYS = Object.keys(AREAS) as AreaKey[]

export const ROLES = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  voluntario: 'Voluntario',
} as const

export type RoleKey = keyof typeof ROLES

export const TASK_STATUSES = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  hecho: 'Hecho',
} as const

export type TaskStatus = keyof typeof TASK_STATUSES

export const TASK_STATUS_KEYS = Object.keys(TASK_STATUSES) as TaskStatus[]

export const PRIORITIES = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
} as const

export type PriorityKey = keyof typeof PRIORITIES

export const DEADLINE_STATUSES = {
  pendiente: 'Pendiente',
  pagado: 'Resuelto',
  vencido: 'Vencido',
} as const

export const RECURRENCE = {
  unico: 'Único',
  mensual: 'Mensual',
  anual: 'Anual',
} as const

export const DOC_STATUSES = {
  procesando: 'Procesando',
  listo: 'Listo',
  error: 'Error',
} as const

export const DOC_FILE_TYPES = {
  texto: 'Texto',
  imagen: 'Imagen',
} as const

export type DocFileType = keyof typeof DOC_FILE_TYPES
