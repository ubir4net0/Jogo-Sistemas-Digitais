/**
 * ParkingEnvironment — cenário estático: piso, asfalto, rua, calçadas,
 * sinalização horizontal, muros, cabine de controle, iluminação pública,
 * árvores, edifícios de fundo, painel digital de entrada e sinalização de
 * manutenção.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS, FONT_STACK, GEO, MAT, labelTexture, ledMaterial } from './assets'
import { useSimulation } from '../../store/simulationStore'
import { ENTRY_LANE_X, EXIT_LANE_X, LANE_HALF_WIDTH, LOT, STREET } from '../../engine/simulation/layout'
import { bitsToString, CAPACITY } from '../../engine/logic/counter'

const SIDEWALK_MIN_Z = LOT.maxZ
const SIDEWALK_MAX_Z = STREET.minZ
const WORLD = 46

function Plane({ x, z, w, d, y = 0, material }: { x: number; z: number; w: number; d: number; y?: number; material: THREE.Material }) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} geometry={GEO.plane} material={material} receiveShadow />
  )
}

function Box({ p, s, m, cast = true }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; cast?: boolean }) {
  return <mesh position={p} scale={s} geometry={GEO.box} material={m} castShadow={cast} receiveShadow />
}

/** Seta de sentido de circulação pintada no piso. */
function arrowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#e8edf2'
  ctx.beginPath()
  ctx.moveTo(64, 8)
  ctx.lineTo(120, 92)
  ctx.lineTo(82, 92)
  ctx.lineTo(82, 248)
  ctx.lineTo(46, 248)
  ctx.lineTo(46, 92)
  ctx.lineTo(8, 92)
  ctx.closePath()
  ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function windowsTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#121822'
  ctx.fillRect(0, 0, 128, 256)
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let y = 8; y < 248; y += 16)
    for (let x = 8; x < 120; x += 14) {
      const lit = rnd() > 0.62
      ctx.fillStyle = lit ? (rnd() > 0.5 ? '#ffd27a' : '#9fd3ff') : '#1c2431'
      ctx.fillRect(x, y, 8, 9)
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Tree({ x, z, s = 1, variant = 0 }: { x: number; z: number; s?: number; variant?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh geometry={GEO.cylinder} material={MAT.trunk} position={[0, 0.7, 0]} scale={[0.22, 1.4, 0.22]} castShadow />
      <mesh geometry={GEO.ico} material={variant ? MAT.foliage2 : MAT.foliage} position={[0, 2.1, 0]} scale={[2.1, 2.0, 2.1]} castShadow />
      <mesh geometry={GEO.ico} material={variant ? MAT.foliage : MAT.foliage2} position={[0.2, 2.9, -0.1]} scale={[1.4, 1.4, 1.4]} castShadow />
    </group>
  )
}

function LampPost({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[0, 2.4, 0]} scale={[0.12, 4.8, 0.12]} castShadow />
      <mesh geometry={GEO.box} material={MAT.darkMetal} position={[0, 4.75, 0.55]} scale={[0.1, 0.1, 1.2]} />
      <mesh geometry={GEO.box} material={MAT.lampHead} position={[0, 4.68, 1.05]} scale={[0.36, 0.08, 0.5]} />
    </group>
  )
}

/** Painel digital da entrada: vagas livres, ocupação binária e avisos. */
function EntryDisplay() {
  const key = useSimulation((s) => {
    const occ = s.sim.spots.filter((x) => x.status === 'OCCUPIED').length
    const res = s.sim.spots.filter((x) => x.status === 'RESERVED').length
    return `${CAPACITY - occ - res}|${occ}|${s.sim.maintenance ? 1 : 0}|${bitsToString(s.sim.counter.bits)}`
  })
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [canvas])
  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    const [free, occ, maint, bits] = key.split('|')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.fillStyle = '#05080d'
    ctx.fillRect(0, 0, 512, 256)
    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, 504, 248)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const full = Number(free) === 0
    if (maint === '1') {
      ctx.fillStyle = '#f59e0b'
      ctx.font = `800 60px ${FONT_STACK}`
      ctx.fillText('MANUTENÇÃO', 256, 92)
      ctx.font = `600 34px ${FONT_STACK}`
      ctx.fillStyle = '#fde68a'
      ctx.fillText('ENTRADA BLOQUEADA', 256, 168)
    } else if (full) {
      ctx.fillStyle = '#ef4444'
      ctx.font = `900 96px ${FONT_STACK}`
      ctx.fillText('LOTADO', 256, 104)
      ctx.font = `600 34px ${FONT_STACK}`
      ctx.fillStyle = '#fca5a5'
      ctx.fillText(`OCUPADAS ${occ}/8 · ${bits}`, 256, 188)
    } else {
      ctx.fillStyle = '#94a3b8'
      ctx.font = `600 32px ${FONT_STACK}`
      ctx.fillText('VAGAS LIVRES', 256, 46)
      ctx.fillStyle = '#22c55e'
      ctx.font = `900 120px ${FONT_STACK}`
      ctx.fillText(String(free).padStart(2, '0'), 256, 132)
      ctx.font = `600 30px ${FONT_STACK}`
      ctx.fillStyle = '#7dd3fc'
      ctx.fillText(`OCUPADAS ${occ} · BIN ${bits}`, 256, 216)
    }
    texture.needsUpdate = true
  }, [key, canvas, texture])

  return (
    <group position={[-16.2, 0, 10.3]} rotation={[0, 0.45, 0]}>
      <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[-1.1, 1.4, 0]} scale={[0.12, 2.8, 0.12]} castShadow />
      <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[1.1, 1.4, 0]} scale={[0.12, 2.8, 0.12]} castShadow />
      <mesh geometry={GEO.box} material={MAT.trim} position={[0, 3.3, -0.02]} scale={[3.0, 1.6, 0.18]} castShadow />
      <mesh position={[0, 3.3, 0.075]}>
        <planeGeometry args={[2.8, 1.4]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Sinalização de manutenção (cavalete + luz âmbar piscante). */
function MaintenanceSign() {
  const on = useSimulation((s) => s.sim.maintenance)
  const light = useRef<THREE.Mesh>(null)
  const tex = useMemo(
    () => labelTexture('MANUTENÇÃO', { width: 512, height: 128, background: '#f59e0b', color: '#111827', border: '#111827' }),
    [],
  )
  useFrame(({ clock }) => {
    if (light.current) light.current.visible = Math.sin(clock.elapsedTime * 7) > 0
  })
  if (!on) return null
  return (
    <group position={[-13.9, 0, 11.3]} rotation={[0, 0.25, 0]}>
      <mesh geometry={GEO.box} material={MAT.trim} position={[-0.8, 0.55, 0]} rotation={[0.18, 0, 0]} scale={[0.08, 1.1, 0.08]} />
      <mesh geometry={GEO.box} material={MAT.trim} position={[0.8, 0.55, 0]} rotation={[0.18, 0, 0]} scale={[0.08, 1.1, 0.08]} />
      <mesh position={[0, 0.9, 0.12]} rotation={[-0.18, 0, 0]}>
        <planeGeometry args={[1.9, 0.48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh ref={light} geometry={GEO.sphere} material={ledMaterial('#f59e0b', 4)} position={[0, 1.35, 0]} scale={0.22} />
    </group>
  )
}

function ControlBooth() {
  const sign = labelTexture('CONTROLE', { width: 512, height: 128, background: '#0b1220', color: '#38bdf8', border: '#1d4ed8' })
  return (
    <group position={[0, 0, 10.2]}>
      <Box p={[0, 0.08, 0]} s={[3.6, 0.16, 2.6]} m={MAT.curb} />
      <Box p={[0, 0.75, 0]} s={[3.2, 1.2, 2.2]} m={MAT.wall} />
      <Box p={[0, 1.75, 0]} s={[3.2, 0.8, 2.2]} m={MAT.boothGlass} />
      <Box p={[-1.55, 1.75, 1.05]} s={[0.1, 0.8, 0.1]} m={MAT.darkMetal} />
      <Box p={[1.55, 1.75, 1.05]} s={[0.1, 0.8, 0.1]} m={MAT.darkMetal} />
      <Box p={[0, 2.25, 0]} s={[3.8, 0.18, 2.8]} m={MAT.wallTop} />
      <mesh position={[0, 2.6, 0.6]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <Box p={[0, 2.6, 0.55]} s={[2.5, 0.68, 0.06]} m={MAT.trim} cast={false} />
      {/* Antena / rack de comunicação */}
      <Box p={[1.3, 2.9, -0.8]} s={[0.06, 1.1, 0.06]} m={MAT.metal} />
      <mesh geometry={GEO.sphere} material={ledMaterial('#38bdf8', 3)} position={[1.3, 3.5, -0.8]} scale={0.12} />
    </group>
  )
}

function Building({ x, z, w, h, d, seed }: { x: number; z: number; w: number; h: number; d: number; seed: number }) {
  const mat = useMemo(() => {
    const t = windowsTexture(seed)
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(Math.max(1, Math.round(w / 5)), Math.max(1, Math.round(h / 9)))
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.8 })
  }, [seed, w, h])
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} scale={[w, h, d]} geometry={GEO.box} material={mat} />
      <mesh position={[0, h + 0.15, 0]} scale={[w + 0.3, 0.3, d + 0.3]} geometry={GEO.box} material={MAT.buildingA} />
    </group>
  )
}

function StreetMarkings() {
  const dashes = []
  for (let x = -WORLD + 1; x < WORLD; x += 3.2) {
    // Interrompe a faixa central nos acessos (entrada e saída).
    if (Math.abs(x - ENTRY_LANE_X) < 3 || Math.abs(x - EXIT_LANE_X) < 4) continue
    dashes.push(<Box key={x} p={[x, 0.012, (STREET.nearLaneZ + STREET.farLaneZ) / 2]} s={[1.6, 0.01, 0.12]} m={MAT.lineYellow} cast={false} />)
  }
  return (
    <group>
      {dashes}
      <Box p={[0, 0.012, STREET.maxZ - 0.25]} s={[WORLD * 2, 0.01, 0.1]} m={MAT.line} cast={false} />
    </group>
  )
}

function LotMarkings() {
  const arrow = useMemo(() => arrowTexture(), [])
  const entryText = labelTexture('ENTRADA', { width: 512, height: 128, color: '#e8edf2' })
  const exitText = labelTexture('SAÍDA', { width: 512, height: 128, color: '#e8edf2' })
  const arrows: { x: number; z: number; rot: number }[] = [
    { x: ENTRY_LANE_X, z: 4.6, rot: 0 },
    { x: -2.4, z: 0, rot: -Math.PI / 2 },
    { x: 3.6, z: 0, rot: -Math.PI / 2 },
    { x: EXIT_LANE_X, z: 3.4, rot: Math.PI },
  ]
  return (
    <group>
      {arrows.map((a, i) => (
        <mesh key={i} position={[a.x, 0.013, a.z]} rotation={[-Math.PI / 2, 0, a.rot]}>
          <planeGeometry args={[0.8, 1.8]} />
          <meshBasicMaterial map={arrow} transparent opacity={0.8} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      {/* Textos no piso dos acessos */}
      <mesh position={[ENTRY_LANE_X, 0.075, 11.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshBasicMaterial map={entryText} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[EXIT_LANE_X, 0.075, 10.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshBasicMaterial map={exitText} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Linhas de retenção antes das cancelas */}
      <Box p={[ENTRY_LANE_X, 0.075, 8.45]} s={[LANE_HALF_WIDTH * 2, 0.01, 0.16]} m={MAT.line} cast={false} />
      <Box p={[EXIT_LANE_X, 0.013, 7.55]} s={[LANE_HALF_WIDTH * 2, 0.01, 0.16]} m={MAT.line} cast={false} />
      {/* Bordas das faixas de circulação */}
      <Box p={[ENTRY_LANE_X + LANE_HALF_WIDTH, 0.012, 5.2]} s={[0.08, 0.01, 5.6]} m={MAT.lineYellow} cast={false} />
      <Box p={[EXIT_LANE_X - LANE_HALF_WIDTH, 0.012, 5.2]} s={[0.08, 0.01, 5.6]} m={MAT.lineYellow} cast={false} />
    </group>
  )
}

function Walls() {
  const h = 0.55
  const t = 0.25
  const y = h / 2
  const W = LOT.maxX - LOT.minX
  const Dz = LOT.maxZ - LOT.minZ
  const midZ = (LOT.maxZ + LOT.minZ) / 2
  const southInnerHalf = ENTRY_LANE_X + LANE_HALF_WIDTH // −9.4
  return (
    <group>
      <Box p={[0, y, LOT.minZ]} s={[W + t, h, t]} m={MAT.wall} />
      <Box p={[LOT.minX, y, midZ]} s={[t, h, Dz]} m={MAT.wall} />
      <Box p={[LOT.maxX, y, midZ]} s={[t, h, Dz]} m={MAT.wall} />
      <Box p={[0, y, LOT.maxZ]} s={[-southInnerHalf * 2, h, t]} m={MAT.wall} />
      {/* Topo dos muros */}
      <Box p={[0, h + 0.03, LOT.minZ]} s={[W + t + 0.1, 0.06, t + 0.1]} m={MAT.wallTop} />
      <Box p={[LOT.minX, h + 0.03, midZ]} s={[t + 0.1, 0.06, Dz]} m={MAT.wallTop} />
      <Box p={[LOT.maxX, h + 0.03, midZ]} s={[t + 0.1, 0.06, Dz]} m={MAT.wallTop} />
      <Box p={[0, h + 0.03, LOT.maxZ]} s={[-southInnerHalf * 2 + 0.1, 0.06, t + 0.1]} m={MAT.wallTop} />
    </group>
  )
}

function ParkingEnvironmentInner() {
  const lotW = LOT.maxX - LOT.minX
  const lotD = LOT.maxZ - LOT.minZ
  const sidewalkD = SIDEWALK_MAX_Z - SIDEWALK_MIN_Z
  const sidewalkZ = (SIDEWALK_MAX_Z + SIDEWALK_MIN_Z) / 2
  const driveW = LANE_HALF_WIDTH * 2
  const westSideW = WORLD + (ENTRY_LANE_X - LANE_HALF_WIDTH)
  const midSideW = (ENTRY_LANE_X + LANE_HALF_WIDTH) * -2
  const streetD = STREET.maxZ - STREET.minZ

  return (
    <group>
      {/* Terreno */}
      <Plane x={0} z={0} w={WORLD * 4} d={WORLD * 4} y={-0.03} material={MAT.ground} />
      <Plane x={0} z={-18} w={WORLD * 2} d={18} y={-0.02} material={MAT.grass} />
      <Plane x={-WORLD / 2 - 6.75} z={-0.75} w={WORLD - 13.5} d={18} y={-0.02} material={MAT.grass} />
      <Plane x={WORLD / 2 + 6.75} z={-0.75} w={WORLD - 13.5} d={18} y={-0.02} material={MAT.grass} />
      <Plane x={0} z={STREET.maxZ + 6} w={WORLD * 2} d={12} y={-0.02} material={MAT.grass} />
      {/* Asfalto do estacionamento */}
      <Plane x={(LOT.minX + LOT.maxX) / 2} z={(LOT.minZ + LOT.maxZ) / 2} w={lotW} d={lotD} material={MAT.asphalt} />
      {/* Calçada (com acessos rebaixados) */}
      <Box p={[-WORLD + westSideW / 2, 0.03, sidewalkZ]} s={[westSideW, 0.06, sidewalkD]} m={MAT.sidewalk} cast={false} />
      <Box p={[0, 0.03, sidewalkZ]} s={[midSideW, 0.06, sidewalkD]} m={MAT.sidewalk} cast={false} />
      <Box p={[WORLD - westSideW / 2, 0.03, sidewalkZ]} s={[westSideW, 0.06, sidewalkD]} m={MAT.sidewalk} cast={false} />
      <Plane x={ENTRY_LANE_X} z={sidewalkZ} w={driveW} d={sidewalkD} y={0.005} material={MAT.asphalt} />
      <Plane x={EXIT_LANE_X} z={sidewalkZ} w={driveW} d={sidewalkD} y={0.005} material={MAT.asphalt} />
      {/* Rua */}
      <Plane x={0} z={(STREET.minZ + STREET.maxZ) / 2} w={WORLD * 2} d={streetD} y={0.002} material={MAT.street} />
      <Box p={[0, 0.03, STREET.maxZ + 1]} s={[WORLD * 2, 0.06, 2]} m={MAT.sidewalk} cast={false} />
      <StreetMarkings />
      <LotMarkings />
      <Walls />
      <ControlBooth />
      <EntryDisplay />
      <MaintenanceSign />
      {/* Iluminação pública */}
      <LampPost x={LOT.minX + 0.6} z={LOT.minZ + 0.6} rot={Math.PI * 0.75} />
      <LampPost x={LOT.maxX - 0.6} z={LOT.minZ + 0.6} rot={-Math.PI * 0.75} />
      <LampPost x={0} z={LOT.minZ + 0.5} rot={0} />
      <LampPost x={-22} z={11.4} rot={0} />
      <LampPost x={22} z={11.4} rot={0} />
      {/* Arborização */}
      {[
        [-17.5, -6, 1.0, 0],
        [-18.5, -1, 0.85, 1],
        [-17, 3.5, 0.95, 0],
        [17.5, -6, 1.0, 1],
        [18.5, -1, 0.9, 0],
        [17, 3.5, 0.95, 1],
        [-12, -13, 1.1, 1],
        [-5, -12.5, 0.9, 0],
        [3, -13, 1.05, 1],
        [11, -12.5, 0.95, 0],
        [-30, 10, 0.8, 0],
        [-36, 10, 0.75, 1],
        [28, 10, 0.8, 1],
        [35, 10, 0.75, 0],
        [6, 10.3, 0.6, 0],
        [-5.5, 10.3, 0.6, 1],
      ].map(([x, z, s, v], i) => (
        <Tree key={i} x={x} z={z} s={s} variant={v} />
      ))}
      {/* Edifícios ao fundo */}
      <Building x={-26} z={-33} w={10} h={9} d={8} seed={3} />
      <Building x={-12} z={-35} w={12} h={13} d={9} seed={7} />
      <Building x={2} z={-33} w={9} h={8} d={8} seed={11} />
      <Building x={16} z={-34} w={11} h={11} d={9} seed={19} />
      <Building x={30} z={-32} w={9} h={7} d={8} seed={23} />
    </group>
  )
}

export const ParkingEnvironment = memo(ParkingEnvironmentInner)
export { COLORS }
