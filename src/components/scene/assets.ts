/**
 * Recursos compartilhados da cena: materiais, geometrias e texturas de texto
 * desenhadas em <canvas> (funciona 100% offline, sem fontes externas).
 * Criados uma única vez e reutilizados por todas as instâncias.
 */
import * as THREE from 'three'

export const COLORS = {
  background: '#0b0f14',
  ground: '#0e1318',
  grass: '#122019',
  asphalt: '#2a2f37',
  street: '#1f232a',
  sidewalk: '#454b55',
  curb: '#5b616b',
  line: '#e8edf2',
  yellow: '#facc15',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#38bdf8',
  electric: '#2f8cff',
  amber: '#f59e0b',
} as const

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra })

export const MAT = {
  ground: std(COLORS.ground, { roughness: 1 }),
  grass: std(COLORS.grass, { roughness: 1 }),
  asphalt: std(COLORS.asphalt, { roughness: 0.95 }),
  street: std(COLORS.street, { roughness: 0.95 }),
  sidewalk: std(COLORS.sidewalk, { roughness: 0.9 }),
  curb: std(COLORS.curb, { roughness: 0.8 }),
  line: new THREE.MeshBasicMaterial({ color: COLORS.line, toneMapped: false }),
  lineYellow: new THREE.MeshBasicMaterial({ color: COLORS.yellow, toneMapped: false }),
  wall: std('#3a414c', { roughness: 0.7 }),
  wallTop: std('#5a6472', { roughness: 0.6 }),
  metal: std('#9aa4b2', { roughness: 0.35, metalness: 0.8 }),
  darkMetal: std('#2a313b', { roughness: 0.5, metalness: 0.6 }),
  gateBody: std('#1d232c', { roughness: 0.5, metalness: 0.4 }),
  gateYellow: std('#f2b705', { roughness: 0.5, metalness: 0.2 }),
  armWhite: std('#f5f7fa', { roughness: 0.4 }),
  armRed: std('#e11d48', { roughness: 0.45 }),
  trunk: std('#4a3424', { roughness: 1 }),
  foliage: std('#1f5a3a', { roughness: 0.9, flatShading: true }),
  foliage2: std('#2a6e46', { roughness: 0.9, flatShading: true }),
  glass: new THREE.MeshStandardMaterial({ color: '#0d1a2a', roughness: 0.08, metalness: 0.9, envMapIntensity: 1 }),
  boothGlass: new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.1, metalness: 0.6, emissive: '#0b2540', emissiveIntensity: 0.6 }),
  rubber: std('#111317', { roughness: 0.9 }),
  hub: std('#c3cad4', { roughness: 0.3, metalness: 0.9 }),
  trim: std('#15181d', { roughness: 0.6 }),
  plate: std('#f1f5f9', { roughness: 0.5 }),
  headlight: new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#fff1c2', emissiveIntensity: 1.6, toneMapped: false }),
  lampHead: new THREE.MeshStandardMaterial({ color: '#fef3c7', emissive: '#fde68a', emissiveIntensity: 1.4, toneMapped: false }),
  buildingA: std('#161c25', { roughness: 0.8 }),
  buildingB: std('#1b2230', { roughness: 0.8 }),
} as const

const bodyCache = new Map<string, THREE.MeshStandardMaterial>()
export function bodyMaterial(color: string): THREE.MeshStandardMaterial {
  let m = bodyCache.get(color)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.55 })
    bodyCache.set(color, m)
  }
  return m
}

const emissiveCache = new Map<string, THREE.MeshStandardMaterial>()
/** Material emissivo (LEDs, indicadores). */
export function ledMaterial(color: string, intensity = 2): THREE.MeshStandardMaterial {
  const key = `${color}-${intensity}`
  let m = emissiveCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: false })
    emissiveCache.set(key, m)
  }
  return m
}

const dimCache = new Map<string, THREE.MeshStandardMaterial>()
export function dimMaterial(color: string): THREE.MeshStandardMaterial {
  let m = dimCache.get(color)
  if (!m) {
    const c = new THREE.Color(color).multiplyScalar(0.18)
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.25 })
    dimCache.set(color, m)
  }
  return m
}

// ───────────────────────────── geometrias ─────────────────────────────

const frustum = new THREE.CylinderGeometry(0.5 * Math.SQRT2 * 0.78, 0.5 * Math.SQRT2, 1, 4, 1)
frustum.rotateY(Math.PI / 4)

const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 20)
wheel.rotateZ(Math.PI / 2)
const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.27, 12)
hub.rotateZ(Math.PI / 2)

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  frustum,
  wheel,
  hub,
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cone: new THREE.ConeGeometry(0.5, 1, 7),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  ring: new THREE.RingGeometry(2.55, 2.85, 48),
} as const

// ───────────────────────────── texturas de texto ─────────────────────────────

export interface LabelOptions {
  width?: number
  height?: number
  font?: string
  color?: string
  background?: string | null
  align?: CanvasTextAlign
  border?: string | null
}

const FONT_STACK = '"Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const textureCache = new Map<string, THREE.CanvasTexture>()

/** Textura estática com texto (cacheada por conteúdo). */
export function labelTexture(text: string, opts: LabelOptions = {}): THREE.CanvasTexture {
  const key = JSON.stringify([text, opts])
  const cached = textureCache.get(key)
  if (cached) return cached
  const w = opts.width ?? 256
  const h = opts.height ?? 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, w, h)
  }
  if (opts.border) {
    ctx.strokeStyle = opts.border
    ctx.lineWidth = Math.max(4, h * 0.05)
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth)
  }
  ctx.fillStyle = opts.color ?? '#ffffff'
  ctx.font = opts.font ?? `700 ${Math.round(h * 0.62)}px ${FONT_STACK}`
  ctx.textAlign = opts.align ?? 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, opts.align === 'left' ? 8 : w / 2, h / 2 + h * 0.03)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  textureCache.set(key, tex)
  return tex
}

export { FONT_STACK }
