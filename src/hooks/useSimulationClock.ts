import { useEffect } from 'react'
import { useSimulation } from '../store/simulationStore'

/**
 * SimulationScheduler — relógio único da simulação.
 * Um único requestAnimationFrame alimenta o motor com o tempo real
 * decorrido. Ao desmontar, o laço é cancelado (sem timers órfãos).
 * Quando a aba fica oculta o navegador suspende o rAF; o dt é limitado
 * no motor para evitar saltos ao voltar.
 */
export function useSimulationClock(): void {
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      useSimulation.getState().tick(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onVisibility = () => {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
