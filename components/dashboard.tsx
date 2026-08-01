'use client'

import { useState } from 'react'
import type {
  Alert,
  CurrentMember,
  Deadline,
  Task,
  DocumentRow,
  TeamMember,
} from '@/lib/types'
import { AppSidebar, MobileNav } from '@/components/app-sidebar'
import { Topbar } from '@/components/topbar'
import { OverviewView } from '@/components/views/overview-view'
import { AreaView } from '@/components/views/area-view'
import { TasksView } from '@/components/views/tasks-view'
import { DocumentsView } from '@/components/views/documents-view'
import { AssistantPanel } from '@/components/assistant-panel'

export type ViewKey =
  | 'overview'
  | 'legal'
  | 'comunicacion'
  | 'educacion'
  | 'tareas'
  | 'documentos'

export function Dashboard({
  member,
  deadlines,
  tasks,
  alerts,
  documents,
  team,
}: {
  member: CurrentMember | null
  deadlines: Deadline[]
  tasks: Task[]
  alerts: Alert[]
  documents: DocumentRow[]
  team: TeamMember[]
}) {
  const [view, setView] = useState<ViewKey>('overview')
  const [assistantOpen, setAssistantOpen] = useState(false)

  const activeAlerts = alerts.filter((a) => !a.resolved)

  return (
    <div className="min-h-svh bg-background text-foreground flex">
      <AppSidebar
        view={view}
        onChange={setView}
        alertCount={activeAlerts.length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          member={member}
          onOpenAssistant={() => setAssistantOpen(true)}
          alertCount={activeAlerts.length}
        />

        <MobileNav
          view={view}
          onChange={setView}
          alertCount={activeAlerts.length}
        />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto">
          {view === 'overview' && (
            <OverviewView
              deadlines={deadlines}
              tasks={tasks}
              alerts={alerts}
              onNavigate={setView}
            />
          )}
          {(view === 'legal' ||
            view === 'comunicacion' ||
            view === 'educacion') && (
            <AreaView
              area={view}
              deadlines={deadlines}
              tasks={tasks}
              alerts={alerts}
            />
          )}
          {view === 'tareas' && (
            <TasksView tasks={tasks} member={member} team={team} />
          )}
          {view === 'documentos' && (
            <DocumentsView documents={documents} />
          )}
        </main>
      </div>

      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  )
}
