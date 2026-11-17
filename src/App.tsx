import { lazy, Suspense } from 'react'
import { BookOpen, Box, FlaskConical } from 'lucide-react'
import { useSimulationClock } from './hooks/useSimulationClock'
import { useUi, type AppTab } from './store/uiStore'
import { useSimulation } from './store/simulationStore'
import { STATUS_META, systemStatus } from './engine/simulation/derived'
import { ControlDashboard } from './components/dashboard/ControlDashboard'
import { NoticeToast, ViewportOverlay } from './components/scene/ViewportOverlay'
import { cx } from './components/ui/primitives'

const Scene3D = lazy(() => import('./components/scene/Scene3D').then((m) => ({ default: m.Scene3D })))
const DigitalLaboratory = lazy(() => import('./components/lab/DigitalLaboratory').then((m) => ({ default: m.DigitalLaboratory })))
const EducationalContent = lazy(() => import('./components/about/EducationalContent').then((m) => ({ default: m.EducationalContent })))

const TABS: { id: AppTab; label: string; short: string; icon: typeof Box }[] = [
  { id: 'simulation', label: 'Simulação 3D', short: 'Simulação', icon: Box },
  { id: 'lab', label: 'Laboratório de Sistemas Digitais', short: 'Laboratório', icon: FlaskConical },
  { id: 'about', label: 'Sobre o projeto', short: 'Sobre', icon: BookOpen },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#0f1722" />
        <rect x="6" y="6" width="52" height="52" rx="10" fill="none" stroke="#2f8cff" strokeWidth="3" />
        <path d="M22 46V18h12a9 9 0 0 1 0 18H22" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="46" cy="46" r="4" fill="#22c55e" />
      </svg>
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-wide text-white">
          SMART PARKING <span className="text-sky-400">3D</span>
        </div>
        <div className="hidden text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:block">Sistema digital de estacionamento</div>
      </div>
    </div>
  )
}

function HeaderStatus() {
  const status = useSimulation((s) => systemStatus(s.sim))
  const meta = STATUS_META[status]
  const dot = { green: 'bg-emerald-400 led-glow-green', red: 'bg-red-500 led-glow-red', yellow: 'bg-yellow-400 led-glow-yellow', gray: 'bg-slate-400' }[meta.tone]
  return (
    <div className="hidden items-center gap-2 rounded-full border border-slate-700/70 bg-graphite-900 px-3 py-1.5 text-xs font-semibold text-slate-200 xl:flex">
      <span className={cx('h-2.5 w-2.5 rounded-full', dot)} />
      {meta.label}
    </div>
  )
}

function Header() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-graphite-950/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
        <Logo />
        <nav role="tablist" aria-label="Seções" className="ml-auto flex gap-1 rounded-xl border border-slate-800 bg-graphite-900 p-1 lg:ml-6 lg:mr-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-[13px]',
                tab === t.id ? 'bg-electric-500 text-white shadow-[0_6px_18px_-8px_rgba(47,140,255,0.9)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline lg:hidden">{t.short}</span>
              <span className="hidden lg:inline">{t.label}</span>
            </button>
          ))}
        </nav>
        <HeaderStatus />
      </div>
    </header>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center bg-graphite-950 text-sm text-slate-400">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        {label}
      </div>
    </div>
  )
}

function SimulationView() {
  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="relative h-[62dvh] min-h-[380px] overflow-hidden border-b border-slate-800 lg:h-full lg:border-b-0" aria-label="Estacionamento 3D">
        <Suspense fallback={<Loading label="Carregando cena 3D…" />}>
          <Scene3D />
        </Suspense>
        <ViewportOverlay />
      </section>
      <aside className="border-slate-800 bg-graphite-950 lg:overflow-y-auto lg:border-l" aria-label="Painel de controle">
        <ControlDashboard />
      </aside>
    </div>
  )
}

export default function App() {
  useSimulationClock()
  const tab = useUi((s) => s.tab)
  return (
    <div className="min-h-dvh bg-graphite-950">
      <Header />
      <main>
        {tab === 'simulation' && <SimulationView />}
        {tab === 'lab' && (
          <Suspense fallback={<Loading label="Carregando laboratório…" />}>
            <DigitalLaboratory />
          </Suspense>
        )}
        {tab === 'about' && (
          <Suspense fallback={<Loading label="Carregando…" />}>
            <EducationalContent />
          </Suspense>
        )}
      </main>
      <NoticeToast />
    </div>
  )
}
