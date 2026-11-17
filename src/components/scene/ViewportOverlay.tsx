/** Elementos sobrepostos à cena 3D: câmeras, qualidade, sinais e estados ao vivo. */
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Box, Construction, DoorOpen, Eye, LogOut, Map as MapIcon, MonitorCog, PauseCircle, Rotate3d, Bot } from 'lucide-react'
import { useSimulation } from '../../store/simulationStore'
import { useUi, type CameraPreset } from '../../store/uiStore'
import { NOT } from '../../engine/logic/gates'
import { ENTRY_FSM, EXIT_FSM } from '../../engine/fsm/fsm'
import { SelectionCard } from '../dashboard/SelectionCard'
import { cx } from '../ui/primitives'

const CAMERA_BUTTONS: { id: CameraPreset; label: string; icon: typeof Eye }[] = [
  { id: 'iso', label: 'Isométrica', icon: Rotate3d },
  { id: 'top', label: 'Superior', icon: MapIcon },
  { id: 'entry', label: 'Entrada', icon: DoorOpen },
  { id: 'exit', label: 'Saída', icon: LogOut },
  { id: 'overview', label: 'Visão geral', icon: Eye },
]

function CameraBar() {
  const setCamera = useUi((s) => s.setCamera)
  const current = useUi((s) => s.camera.preset)
  return (
    <div className="glass pointer-events-auto flex gap-1 rounded-xl p-1" role="toolbar" aria-label="Câmera">
      {CAMERA_BUTTONS.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setCamera(b.id)}
          title={`Câmera: ${b.label}`}
          className={cx(
            'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors',
            current === b.id ? 'bg-electric-500 text-white' : 'text-slate-300 hover:bg-white/10',
          )}
        >
          <b.icon className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{b.label}</span>
        </button>
      ))}
    </div>
  )
}

function QualityToggle() {
  const quality = useUi((s) => s.quality)
  const setQuality = useUi((s) => s.setQuality)
  return (
    <button
      type="button"
      onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
      className="glass pointer-events-auto flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-semibold text-slate-300 hover:text-white"
      title="Alternar qualidade gráfica (sombras e resolução)"
    >
      <MonitorCog className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Qualidade:</span> {quality === 'high' ? 'Alta' : 'Leve'}
    </button>
  )
}

function ModeBadges() {
  const paused = useSimulation((s) => s.sim.paused)
  const maintenance = useSimulation((s) => s.sim.maintenance)
  const auto = useSimulation((s) => s.sim.auto.enabled)
  const speed = useSimulation((s) => s.sim.speed)
  return (
    <div className="pointer-events-none flex flex-wrap justify-center gap-1.5">
      {paused && (
        <span className="flex items-center gap-1.5 rounded-full border border-slate-400/50 bg-slate-800/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-200">
          <PauseCircle className="h-3.5 w-3.5" /> Pausado
        </span>
      )}
      {maintenance && (
        <span className="flex animate-pulse items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          <Construction className="h-3.5 w-3.5" /> Manutenção — entradas bloqueadas
        </span>
      )}
      {auto && (
        <span className="flex items-center gap-1.5 rounded-full border border-sky-400/50 bg-sky-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-200">
          <Bot className="h-3.5 w-3.5" /> Automático
        </span>
      )}
      {speed !== 1 && <span className="rounded-full border border-slate-500/50 bg-slate-800/80 px-3 py-1 font-mono text-[11px] font-bold text-slate-200">{String(speed).replace('.', ',')}×</span>}
    </div>
  )
}

function Sig({ name, v, tone = 'yellow' }: { name: string; v: number; tone?: 'yellow' | 'red' }) {
  return (
    <div className={cx('flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px]', v ? (tone === 'red' ? 'border-red-400/50 bg-red-500/20 text-red-200' : 'border-yellow-400/50 bg-yellow-500/20 text-yellow-100') : 'border-slate-700 bg-slate-900/70 text-slate-500')}>
      <span className="font-semibold">{name}</span>
      <span className="font-bold">{v}</span>
    </div>
  )
}

function SignalStrip() {
  const s = useSimulation((st) => st.sim.signals)
  const entry = useSimulation((st) => st.sim.entry.state)
  const exit = useSimulation((st) => st.sim.exit.state)
  return (
    <div className="glass pointer-events-auto w-full rounded-2xl p-2 sm:p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Sig name="SE" v={s.SE} />
        <Sig name="P" v={s.P} />
        <Sig name="SS" v={s.SS} />
        <Sig name="PS" v={s.PS} />
        <Sig name="L" v={s.L} tone="red" />
        <Sig name="M" v={s.M} />
        <Sig name="CE" v={s.CE} />
        <Sig name="CS" v={s.CS} />
        <Sig name="R" v={s.R} tone="red" />
        <div className="ml-auto hidden items-center gap-1 font-mono text-[11.5px] lg:flex">
          <span className="text-slate-400">AUT = SE·L̄·M̄ =</span>
          <span className="text-yellow-200">
            {s.SE}·{NOT(s.L)}·{NOT(s.M)}
          </span>
          <span className="text-slate-400">=</span>
          <span className={cx('rounded px-1.5 font-bold', s.ENTRADA_AUTORIZADA ? 'bg-emerald-500/25 text-emerald-300' : 'bg-red-500/20 text-red-300')}>{s.ENTRADA_AUTORIZADA}</span>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-slate-500">FSM entrada:</span>
          <span className={cx('truncate rounded px-1.5 py-0.5 font-mono font-semibold', entry === 'IDLE' ? 'bg-slate-800 text-slate-400' : entry === 'ACCESS_DENIED' ? 'bg-red-500/20 text-red-200' : 'bg-sky-500/20 text-sky-200')}>
            {entry}
          </span>
          <span className="hidden truncate text-slate-500 xl:inline">{ENTRY_FSM.labels[entry]}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-slate-500">FSM saída:</span>
          <span className={cx('truncate rounded px-1.5 py-0.5 font-mono font-semibold', exit === 'IDLE' ? 'bg-slate-800 text-slate-400' : 'bg-sky-500/20 text-sky-200')}>{exit}</span>
          <span className="hidden truncate text-slate-500 xl:inline">{EXIT_FSM.labels[exit]}</span>
        </div>
      </div>
    </div>
  )
}

export function NoticeToast() {
  const notice = useSimulation((s) => s.sim.notice)
  const dismiss = useSimulation((s) => s.dismissNotice)
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => dismiss(notice.id), 3800)
    return () => window.clearTimeout(t)
  }, [notice, dismiss])
  const tone =
    notice?.level === 'danger'
      ? 'border-red-500/50 bg-red-950/90 text-red-100'
      : notice?.level === 'success'
        ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-100'
        : 'border-amber-500/50 bg-amber-950/90 text-amber-100'
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-50 flex justify-center px-4" aria-live="assertive">
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cx('pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur', tone)}
            onClick={() => dismiss(notice.id)}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ViewportOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <CameraBar />
        <div className="hidden flex-1 pt-1 sm:block">
          <ModeBadges />
        </div>
        <QualityToggle />
      </div>
      <div className="sm:hidden">
        <ModeBadges />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="pointer-events-auto hidden w-80 lg:block">
          <SelectionCard floating />
        </div>
        <SignalStrip />
        <div className="hidden w-full items-center justify-center gap-2 text-[10px] text-slate-500 md:flex">
          <Box className="h-3 w-3" /> Arraste para girar · role para aproximar · botão direito para mover · clique em carros e vagas
        </div>
      </div>
    </div>
  )
}
