import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getCurrentMember, getTeam } from '@/app/actions/members'
import { getDeadlines } from '@/app/actions/deadlines'
import { getTasks } from '@/app/actions/tasks'
import { getAlerts } from '@/app/actions/alerts'
import { getDocuments } from '@/app/actions/documents'
import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')

  const [member, deadlines, tasks, alerts, documents, team] = await Promise.all([
    getCurrentMember(),
    getDeadlines(),
    getTasks(),
    getAlerts(),
    getDocuments(),
    getTeam(),
  ])

  return (
    <Dashboard
      member={member}
      deadlines={deadlines}
      tasks={tasks}
      alerts={alerts}
      documents={documents}
      team={team}
    />
  )
}
