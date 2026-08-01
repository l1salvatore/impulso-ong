import type {
  deadline,
  task,
  alert,
  memberProfile,
} from '@/lib/db/schema'
import type { InferSelectModel } from 'drizzle-orm'

export type Deadline = InferSelectModel<typeof deadline>
export type Task = InferSelectModel<typeof task>
export type Alert = InferSelectModel<typeof alert>
export type MemberProfile = InferSelectModel<typeof memberProfile>

export type CurrentMember = MemberProfile & {
  name: string
  email: string
}
