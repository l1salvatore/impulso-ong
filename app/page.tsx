import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getCurrentMember } from '@/app/actions/members'
import { getDeadlines } from '@/app/actions/deadlines'
import { getTasks } from '@/app/actions/tasks'
import { getAlerts } from '@/app/actions/alerts'
import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')

  const [member, deadlines, tasks, alerts] = await Promise.all([
    getCurrentMember(),
    getDeadlines(),
    getTasks(),
    getAlerts(),
  ])

  return (
    <Dashboard
      member={member}
      deadlines={deadlines}
      tasks={tasks}
      alerts={alerts}
    />
  )
}
