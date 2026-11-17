/**
 * Geometria 2D do plano do estacionamento (plano XZ do mundo 3D).
 *
 * Convenção de orientação: heading θ com direção (sin θ, cos θ).
 *  θ = 0      → +Z ("sul", em direção à rua)
 *  θ = π/2    → +X ("leste")
 *  θ = π      → −Z ("norte", fundo do estacionamento)
 *  θ = −π/2   → −X ("oeste")
 * Assim, no Three.js, `rotation.y = θ` orienta um modelo construído olhando para +Z.
 * Girar à esquerda aumenta θ.
 */

export interface Vec2 {
  readonly x: number
  readonly z: number
}

export interface Pose {
  x: number
  z: number
  heading: number
}

export const v2 = (x: number, z: number): Vec2 => ({ x, z })
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.z - a.z)
export const headingOf = (dx: number, dz: number): number => Math.atan2(dx, dz)

/** Rotaciona (x, z) em torno do eixo Y por `a` radianos (mesma convenção do Three.js). */
export function rotate(p: Vec2, a: number): Vec2 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: p.x * c + p.z * s, z: -p.x * s + p.z * c }
}

export const normalizeAngle = (a: number): number => {
  let r = a
  while (r > Math.PI) r -= 2 * Math.PI
  while (r < -Math.PI) r += 2 * Math.PI
  return r
}

/** Construtor de trajetórias compostas por retas e arcos (curvas suaves). */
export class PathBuilder {
  private readonly points: Vec2[]
  private heading: number

  constructor(start: Vec2, heading: number) {
    this.points = [start]
    this.heading = heading
  }

  private get last(): Vec2 {
    return this.points[this.points.length - 1]
  }

  lineTo(x: number, z: number): this {
    const p = this.last
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < 1e-6) return this
    this.heading = headingOf(x - p.x, z - p.z)
    this.points.push(v2(x, z))
    return this
  }

  /** Curva circular de raio `radius` para a esquerda/direita, varrendo `sweep` radianos. */
  turn(side: 'left' | 'right', radius: number, sweep = Math.PI / 2): this {
    const sign = side === 'left' ? 1 : -1
    const p = this.last
    const leftAngle = this.heading + Math.PI / 2
    const left = v2(Math.sin(leftAngle), Math.cos(leftAngle))
    const center = v2(p.x + sign * left.x * radius, p.z + sign * left.z * radius)
    const offset = v2(p.x - center.x, p.z - center.z)
    const steps = Math.max(6, Math.ceil(sweep / 0.12))
    for (let i = 1; i <= steps; i++) {
      const r = rotate(offset, sign * (sweep * i) / steps)
      this.points.push(v2(center.x + r.x, center.z + r.z))
    }
    this.heading += sign * sweep
    return this
  }

  build(): Vec2[] {
    return [...this.points]
  }
}

export interface Polyline {
  readonly points: readonly Vec2[]
  /** Comprimento acumulado até cada ponto. */
  readonly cum: readonly number[]
  readonly length: number
}

export function polyline(points: readonly Vec2[]): Polyline {
  const cum: number[] = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]))
  return { points, cum, length: cum[cum.length - 1] }
}

/** Ponto a uma distância `d` ao longo da polilinha (d é limitado ao intervalo válido). */
export function pointAt(line: Polyline, d: number): Vec2 {
  const { points, cum, length } = line
  if (points.length === 1 || d <= 0) return points[0]
  if (d >= length) return points[points.length - 1]
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid
  }
  const seg = cum[hi] - cum[lo]
  const t = seg > 0 ? (d - cum[lo]) / seg : 0
  const a = points[lo]
  const b = points[hi]
  return v2(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)
}

/** Direção da trajetória (tangente suavizada) a uma distância `d`. */
export function tangentAt(line: Polyline, d: number, window = 0.45): number {
  const a = pointAt(line, Math.max(0, d - window))
  const b = pointAt(line, Math.min(line.length, d + window))
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (Math.abs(dx) + Math.abs(dz) < 1e-9) {
    const p = line.points
    const n = p.length
    return n > 1 ? headingOf(p[n - 1].x - p[n - 2].x, p[n - 1].z - p[n - 2].z) : 0
  }
  return headingOf(dx, dz)
}

// ───────────────────────────── Colisão ─────────────────────────────

export interface Rect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export const rect = (cx: number, cz: number, w: number, d: number): Rect => ({
  minX: cx - w / 2,
  maxX: cx + w / 2,
  minZ: cz - d / 2,
  maxZ: cz + d / 2,
})

/** Vértices do retângulo orientado (OBB) ocupado pelo veículo. */
export function bodyCorners(pose: Pose, length: number, width: number): Vec2[] {
  const fx = Math.sin(pose.heading)
  const fz = Math.cos(pose.heading)
  const rx = Math.cos(pose.heading)
  const rz = -Math.sin(pose.heading)
  const hl = length / 2
  const hw = width / 2
  return [
    v2(pose.x + fx * hl + rx * hw, pose.z + fz * hl + rz * hw),
    v2(pose.x + fx * hl - rx * hw, pose.z + fz * hl - rz * hw),
    v2(pose.x - fx * hl - rx * hw, pose.z - fz * hl - rz * hw),
    v2(pose.x - fx * hl + rx * hw, pose.z - fz * hl + rz * hw),
  ]
}

export function boundsOf(points: readonly Vec2[]): Rect {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  return { minX, maxX, minZ, maxZ }
}

export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ

/** Teste de separação de eixos (SAT) entre dois polígonos convexos. */
export function polygonsOverlap(a: readonly Vec2[], b: readonly Vec2[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]
      const p2 = poly[(i + 1) % poly.length]
      const nx = p2.z - p1.z
      const nz = -(p2.x - p1.x)
      let minA = Infinity
      let maxA = -Infinity
      let minB = Infinity
      let maxB = -Infinity
      for (const p of a) {
        const d = p.x * nx + p.z * nz
        if (d < minA) minA = d
        if (d > maxA) maxA = d
      }
      for (const p of b) {
        const d = p.x * nx + p.z * nz
        if (d < minB) minB = d
        if (d > maxB) maxB = d
      }
      if (maxA <= minB || maxB <= minA) return false
    }
  }
  return true
}
