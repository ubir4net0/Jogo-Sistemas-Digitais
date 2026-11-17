/** EventHistory — registro cronológico dos eventos reais da simulação. */
import { AnimatePresence, motion } from 'motion/react'
import { useSimulation } from '../../store/simulationStore'
import { formatClock } from '../../engine/simulation/derived'
import type { EventLevel } from '../../engine/simulation/types'
import { cx } from '../ui/primitives'

const LEVEL_STYLE: Record<EventLevel, { dot: string; text: string; tag: string }> = {
  info: { dot: 'bg-slate-400', text: 'text-slate-300', tag: 'INFO' },
  success: { dot: 'bg-emerald-400', text: 'text-emerald-200', tag: 'OK' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-200', tag: 'AVISO' },
  danger: { dot: 'bg-red-500', text: 'text-red-200', tag: 'ALERTA' },
  logic: { dot: 'bg-sky-400', text: 'text-sky-200', tag: 'LÓGICA' },
}

export function EventHistory({ limit = 80, className }: { limit?: number; className?: string }) {
  const events = useSimulation((s) => s.sim.events)
  const shown = events.slice(0, limit)
  if (shown.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">Nenhum evento registrado ainda. Adicione um veículo para começar.</p>
  }
  return (
    <ol className={cx('space-y-1', className)} aria-live="polite">
      <AnimatePresence initial={false}>
        {shown.map((e) => {
          const st = LEVEL_STYLE[e.level]
          return (
            <motion.li
              key={e.id}
              layout="position"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
            >
              <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', st.dot)} />
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">{formatClock(e.wall)}</span>
              <span className={cx('min-w-0 flex-1 text-[12.5px] leading-snug', st.text)}>{e.message}</span>
              <span className="hidden shrink-0 rounded bg-white/5 px-1 font-mono text-[9px] text-slate-500 sm:inline">{st.tag}</span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ol>
  )
}
