/**
 * Estado exclusivamente visual (aba, seleção, câmera, qualidade gráfica).
 * Não participa das regras da simulação.
 */
import { create } from 'zustand'

export type AppTab = 'simulation' | 'lab' | 'about'
export type CameraPreset = 'iso' | 'top' | 'entry' | 'exit' | 'overview'
export type Quality = 'high' | 'low'
export type DashboardTab = 'operation' | 'logic' | 'events'

export type Selection = { kind: 'vehicle'; id: string } | { kind: 'spot'; id: string } | null

interface UiStore {
  tab: AppTab
  dashboardTab: DashboardTab
  selection: Selection
  hovered: string | null
  camera: { preset: CameraPreset; nonce: number }
  quality: Quality
  setTab: (t: AppTab) => void
  setDashboardTab: (t: DashboardTab) => void
  select: (s: Selection) => void
  setHovered: (id: string | null) => void
  setCamera: (p: CameraPreset) => void
  setQuality: (q: Quality) => void
}

const readQuality = (): Quality => {
  try {
    const q = localStorage.getItem('smart-parking-quality')
    if (q === 'high' || q === 'low') return q
  } catch {
    /* armazenamento indisponível */
  }
  const small = typeof window !== 'undefined' && window.innerWidth < 768
  return small ? 'low' : 'high'
}

export const useUi = create<UiStore>((set) => ({
  tab: 'simulation',
  dashboardTab: 'operation',
  selection: null,
  hovered: null,
  camera: { preset: 'iso', nonce: 0 },
  quality: readQuality(),
  setTab: (tab) => set({ tab }),
  setDashboardTab: (dashboardTab) => set({ dashboardTab }),
  select: (selection) => set({ selection }),
  setHovered: (hovered) => set({ hovered }),
  setCamera: (preset) => set((s) => ({ camera: { preset, nonce: s.camera.nonce + 1 } })),
  setQuality: (quality) => {
    try {
      localStorage.setItem('smart-parking-quality', quality)
    } catch {
      /* ignorado */
    }
    set({ quality })
  },
}))
