/** ControlDashboard — painel lateral com indicadores, controles, lógica e eventos. */
import { Cpu, History, Settings2 } from 'lucide-react'
import { useUi, type DashboardTab } from '../../store/uiStore'
import { CounterCard, GatesCard, KpiGrid, StatusHeader } from './StatusPanels'
import { ControlsPanel, ScenariosPanel, SpotMap } from './OperationPanel'
import { LogicPanel } from './LogicPanel'
import { EventHistory } from './EventHistory'
import { SelectionCard } from './SelectionCard'
import { Panel, cx } from '../ui/primitives'

const TABS: { id: DashboardTab; label: string; icon: typeof Cpu }[] = [
  { id: 'operation', label: 'Operação', icon: Settings2 },
  { id: 'logic', label: 'Lógica', icon: Cpu },
  { id: 'events', label: 'Eventos', icon: History },
]

export function ControlDashboard() {
  const tab = useUi((s) => s.dashboardTab)
  const setTab = useUi((s) => s.setDashboardTab)
  return (
    <div className="space-y-3 p-3 sm:p-4">
      <StatusHeader />
      <Panel>
        <KpiGrid />
      </Panel>
      <CounterCard />
      <GatesCard />
      <div className="lg:hidden">
        <SelectionCard />
      </div>
      <div role="tablist" aria-label="Seções do painel" className="sticky top-0 z-10 flex gap-1 rounded-xl border border-slate-700/60 bg-graphite-900/95 p-1 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors',
              tab === t.id ? 'bg-electric-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'operation' && (
        <div className="space-y-3">
          <ControlsPanel />
          <SpotMap />
          <ScenariosPanel />
        </div>
      )}
      {tab === 'logic' && <LogicPanel />}
      {tab === 'events' && (
        <Panel title="Histórico de eventos" icon={<History className="h-4 w-4" />}>
          <EventHistory limit={150} />
        </Panel>
      )}
    </div>
  )
}
