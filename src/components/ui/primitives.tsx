import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Bit } from '../../engine/logic/gates'

export const cx = (...classes: (string | false | null | undefined)[]): string => classes.filter(Boolean).join(' ')

export type Tone = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

const TONE_TEXT: Record<Tone, string> = {
  green: 'text-emerald-300',
  red: 'text-red-300',
  yellow: 'text-yellow-300',
  blue: 'text-sky-300',
  gray: 'text-slate-300',
  orange: 'text-orange-300',
}
const TONE_BG: Record<Tone, string> = {
  green: 'bg-emerald-500/12 border-emerald-500/35',
  red: 'bg-red-500/12 border-red-500/35',
  yellow: 'bg-yellow-500/12 border-yellow-500/35',
  blue: 'bg-sky-500/12 border-sky-500/35',
  gray: 'bg-slate-500/12 border-slate-500/35',
  orange: 'bg-orange-500/12 border-orange-500/35',
}
const TONE_DOT: Record<Tone, string> = {
  green: 'bg-emerald-400 led-glow-green',
  red: 'bg-red-500 led-glow-red',
  yellow: 'bg-yellow-400 led-glow-yellow',
  blue: 'bg-sky-400 led-glow-blue',
  gray: 'bg-slate-500',
  orange: 'bg-orange-400',
}

export function Panel({ title, icon, actions, children, className }: { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('panel p-4', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {icon && <span className="text-sky-400">{icon}</span>}
            {title}
          </h3>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Pill({ tone, children, pulse, className }: { tone: Tone; children: ReactNode; pulse?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide', TONE_BG[tone], TONE_TEXT[tone], className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', TONE_DOT[tone], pulse && 'animate-pulse')} />
      {children}
    </span>
  )
}

export function Dot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return <span className={cx('inline-block h-2.5 w-2.5 rounded-full', TONE_DOT[tone], pulse && 'animate-pulse', className)} />
}

/** LED de um sinal binário. */
export function BitLed({ value, tone = 'yellow', size = 'md' }: { value: Bit; tone?: 'yellow' | 'green' | 'red' | 'blue'; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return (
    <span
      aria-label={`valor ${value}`}
      className={cx('inline-block shrink-0 rounded-full border transition-all duration-200', dims, value ? cx(TONE_DOT[tone], 'border-white/30') : 'border-slate-600 bg-slate-800')}
    />
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-electric-500 hover:bg-electric-600 text-white border-electric-400/40 shadow-[0_6px_20px_-8px_rgba(47,140,255,0.8)]',
  secondary: 'bg-graphite-700 hover:bg-graphite-600 text-slate-100 border-slate-600/60',
  danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-200 border-red-500/40',
  warning: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/40',
  success: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
  ghost: 'bg-transparent hover:bg-white/5 text-slate-300 border-transparent',
}

export function Button({ variant = 'secondary', icon, children, className, active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        VARIANT[variant],
        active && 'ring-2 ring-sky-400/70',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-xl border border-slate-700/70 bg-graphite-900 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
            o.value === value ? 'bg-electric-500 text-white' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{children}</kbd>
}
