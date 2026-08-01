import type {
  deadline,
  task,
  alert,
  memberProfile,
  document,
} from '@/lib/db/schema'
import type { InferSelectModel } from 'drizzle-orm'

export type Deadline = InferSelectModel<typeof deadline>
export type Task = InferSelectModel<typeof task>
export type Alert = InferSelectModel<typeof alert>
export type MemberProfile = InferSelectModel<typeof memberProfile>
export type DocumentRow = InferSelectModel<typeof document>

export type CurrentMember = MemberProfile & {
  name: string
  email: string
}

export type TeamMember = {
  userId: string
  role: string
  area: string | null
  name: string | null
  email: string | null
}
