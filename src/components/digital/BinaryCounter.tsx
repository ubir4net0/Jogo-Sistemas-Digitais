/** Contador de 4 bits com LEDs Q3..Q0; bits alterados destacados via XOR. */
import { motion } from 'motion/react'
import { changedBits, fromBits, type Bits4 } from '../../engine/logic/counter'
import { cx } from '../ui/primitives'

export function BinaryCounter({ bits, previous, pulse, size = 'md' }: { bits: Bits4; previous: Bits4; pulse: number; size?: 'md' | 'lg' }) {
  const delta = changedBits(previous, bits)
  const big = size === 'lg'
  return (
    <div className="flex items-end gap-2" role="group" aria-label={`Contador binário ${bits.join('')}`}>
      {bits.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <motion.div
            key={`${pulse}-${i}`}
            initial={delta[i] && pulse > 0 ? { scale: 1.35 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
            className={cx(
              'flex items-center justify-center rounded-lg border font-mono font-bold transition-colors duration-200',
              big ? 'h-14 w-12 text-2xl' : 'h-10 w-9 text-lg',
              b ? 'border-sky-300/60 bg-sky-500/25 text-sky-100 led-glow-blue' : 'border-slate-700 bg-graphite-900 text-slate-500',
              delta[i] === 1 && pulse > 0 && 'ring-2 ring-yellow-400/80',
            )}
          >
            {b}
          </motion.div>
          <span className="font-mono text-[10px] font-semibold text-slate-500">Q{3 - i}</span>
          <span className="font-mono text-[9px] text-slate-600">{2 ** (3 - i)}</span>
        </div>
      ))}
      <div className="ml-1 flex flex-col items-center pb-[30px]">
        <span className="text-slate-500">=</span>
      </div>
      <div className="flex flex-col items-center pb-[26px]">
        <span className={cx('font-mono font-bold text-white', big ? 'text-4xl' : 'text-2xl')}>{fromBits(bits)}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">decimal</span>
      </div>
    </div>
  )
}
