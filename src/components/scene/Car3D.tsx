/**
 * Car3D — veículo 3D construído programaticamente (carroceria, cabine com
 * vidros, teto, 4 rodas, faróis, lanternas, para-choques e retrovisores).
 *
 * A pose é lida do motor a cada quadro (useFrame) e aplicada diretamente ao
 * objeto Three.js — sem re-renderizar o React e sem estado paralelo.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { GEO, MAT, bodyMaterial } from './assets'
import { getSim, useSimulation } from '../../store/simulationStore'
import { useUi } from '../../store/uiStore'
import { PHASE_LABEL } from '../../engine/simulation/derived'
import type { CarModel, Vehicle } from '../../engine/simulation/types'

interface Dims {
  length: number
  width: number
  bodyH: number
  bodyY: number
  cabinL: number
  cabinH: number
  cabinZ: number
  wheelBase: number
}

const DIMS: Record<CarModel, Dims> = {
  sedan: { length: 4.15, width: 1.84, bodyH: 0.58, bodyY: 0.62, cabinL: 2.15, cabinH: 0.5, cabinZ: -0.15, wheelBase: 1.32 },
  hatch: { length: 3.9, width: 1.78, bodyH: 0.62, bodyY: 0.64, cabinL: 2.15, cabinH: 0.54, cabinZ: -0.38, wheelBase: 1.22 },
  suv: { length: 4.2, width: 1.94, bodyH: 0.76, bodyY: 0.73, cabinL: 2.55, cabinH: 0.58, cabinZ: -0.28, wheelBase: 1.36 },
}

const WHEEL_R = 0.34

function selectStatic(id: string): Pick<Vehicle, 'color' | 'model' | 'label' | 'plate' | 'pose'> | null {
  const v = getSim().vehicles.find((x) => x.id === id)
  return v ? { color: v.color, model: v.model, label: v.label, plate: v.plate, pose: { ...v.pose } } : null
}

function CarLabel({ id }: { id: string }) {
  const info = useSimulation((s) => {
    const v = s.sim.vehicles.find((x) => x.id === id)
    return v ? `${v.label}|${v.plate}|${v.phase}|${v.spotId ?? '—'}` : null
  })
  if (!info) return null
  const [label, plate, phase, spot] = info.split('|')
  return (
    <div className="pointer-events-none select-none whitespace-nowrap rounded-lg border border-sky-400/40 bg-slate-950/90 px-2.5 py-1.5 text-[11px] leading-tight text-slate-100 shadow-lg shadow-sky-900/40 backdrop-blur">
      <div className="font-semibold text-sky-300">
        {label} <span className="font-mono text-slate-400">{plate}</span>
      </div>
      <div className="text-slate-300">
        {PHASE_LABEL[phase as Vehicle['phase']]} · vaga {spot}
      </div>
    </div>
  )
}

function Car3DInner({ id }: { id: string }) {
  const initial = useMemo(() => selectStatic(id), [id])
  const group = useRef<THREE.Group>(null)
  const wheelRefs = useRef<(THREE.Group | null)[]>([])
  const selected = useUi((s) => s.selection?.kind === 'vehicle' && s.selection.id === id)
  const hovered = useUi((s) => s.hovered === id)
  const select = useUi((s) => s.select)
  const setHovered = useUi((s) => s.setHovered)

  // Materiais por veículo (intensidade varia: freio / ré).
  const tail = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7f1d1d', emissive: '#ff1f1f', emissiveIntensity: 0.6, toneMapped: false }),
    [],
  )
  const reverseLight = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d1d5db', emissive: '#ffffff', emissiveIntensity: 0, toneMapped: false }),
    [],
  )
  useEffect(
    () => () => {
      tail.dispose()
      reverseLight.dispose()
    },
    [tail, reverseLight],
  )

  const prevVel = useRef(0)
  useFrame(() => {
    const v = getSim().vehicles.find((x) => x.id === id)
    const g = group.current
    if (!v || !g) return
    g.position.set(v.pose.x, 0, v.pose.z)
    g.rotation.y = v.pose.heading
    const spin = v.odometer / WHEEL_R
    for (const w of wheelRefs.current) if (w) w.rotation.x = spin
    const leg = v.legs[v.legIndex]
    const reversing = !!leg && leg.reverse && v.velocity > 0.05
    const braking = v.velocity < prevVel.current - 1e-4 || (v.velocity === 0 && v.phase !== 'PARKED')
    prevVel.current = v.velocity
    tail.emissiveIntensity = braking ? 2.6 : v.phase === 'PARKED' ? 0.15 : 0.7
    reverseLight.emissiveIntensity = reversing ? 2.4 : 0
  })

  if (!initial) return null
  const d = DIMS[initial.model]
  const body = bodyMaterial(initial.color)
  const halfL = d.length / 2
  const wx = d.width / 2 - 0.1
  const wz = halfL - 0.8
  const bodyBottom = d.bodyY - d.bodyH / 2
  const cabinY = d.bodyY + d.bodyH / 2 + d.cabinH / 2 - 0.02
  const roofY = cabinY + d.cabinH / 2

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return // foi um arraste de câmera, não um clique
    select({ kind: 'vehicle', id })
  }

  return (
    <group
      ref={group}
      position={[initial.pose.x, 0, initial.pose.z]}
      rotation={[0, initial.pose.heading, 0]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(id)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(null)
        document.body.style.cursor = ''
      }}
    >
      {/* Carroceria */}
      <RoundedBox args={[d.width, d.bodyH, d.length]} radius={0.16} smoothness={3} position={[0, d.bodyY, 0]} material={body} castShadow receiveShadow />
      {/* Cabine envidraçada (tronco de pirâmide) */}
      <mesh geometry={GEO.frustum} material={MAT.glass} position={[0, cabinY, d.cabinZ]} scale={[d.width * 0.86, d.cabinH, d.cabinL]} castShadow />
      {/* Colunas (pilares) */}
      <mesh geometry={GEO.box} material={body} position={[0, cabinY, d.cabinZ]} scale={[d.width * 0.8, d.cabinH * 0.98, 0.12]} />
      {/* Teto */}
      <RoundedBox args={[d.width * 0.69, 0.07, d.cabinL * 0.76]} radius={0.03} smoothness={2} position={[0, roofY, d.cabinZ]} material={body} castShadow />
      {initial.model === 'suv' && (
        <>
          <mesh geometry={GEO.box} material={MAT.darkMetal} position={[d.width * 0.3, roofY + 0.07, d.cabinZ]} scale={[0.05, 0.05, d.cabinL * 0.7]} />
          <mesh geometry={GEO.box} material={MAT.darkMetal} position={[-d.width * 0.3, roofY + 0.07, d.cabinZ]} scale={[0.05, 0.05, d.cabinL * 0.7]} />
        </>
      )}
      {/* Para-choques */}
      <mesh geometry={GEO.box} material={MAT.trim} position={[0, bodyBottom + 0.12, halfL + 0.02]} scale={[d.width * 0.96, 0.18, 0.12]} />
      <mesh geometry={GEO.box} material={MAT.trim} position={[0, bodyBottom + 0.12, -halfL - 0.02]} scale={[d.width * 0.96, 0.18, 0.12]} />
      {/* Placas */}
      <mesh geometry={GEO.box} material={MAT.plate} position={[0, bodyBottom + 0.3, halfL + 0.03]} scale={[0.52, 0.13, 0.02]} />
      <mesh geometry={GEO.box} material={MAT.plate} position={[0, bodyBottom + 0.34, -halfL - 0.03]} scale={[0.52, 0.13, 0.02]} />
      {/* Faróis */}
      <mesh geometry={GEO.box} material={MAT.headlight} position={[wx - 0.2, d.bodyY + 0.08, halfL + 0.005]} scale={[0.4, 0.13, 0.06]} />
      <mesh geometry={GEO.box} material={MAT.headlight} position={[-wx + 0.2, d.bodyY + 0.08, halfL + 0.005]} scale={[0.4, 0.13, 0.06]} />
      {/* Lanternas + luz de ré */}
      <mesh geometry={GEO.box} material={tail} position={[wx - 0.18, d.bodyY + 0.1, -halfL - 0.005]} scale={[0.42, 0.13, 0.06]} />
      <mesh geometry={GEO.box} material={tail} position={[-wx + 0.18, d.bodyY + 0.1, -halfL - 0.005]} scale={[0.42, 0.13, 0.06]} />
      <mesh geometry={GEO.box} material={reverseLight} position={[0, d.bodyY + 0.1, -halfL - 0.005]} scale={[0.3, 0.08, 0.05]} />
      {/* Retrovisores */}
      <mesh geometry={GEO.box} material={body} position={[d.width / 2 + 0.08, cabinY - d.cabinH * 0.3, d.cabinZ + d.cabinL * 0.42]} scale={[0.16, 0.1, 0.2]} />
      <mesh geometry={GEO.box} material={body} position={[-d.width / 2 - 0.08, cabinY - d.cabinH * 0.3, d.cabinZ + d.cabinL * 0.42]} scale={[0.16, 0.1, 0.2]} />
      {/* Rodas */}
      {(
        [
          [wx, wz],
          [-wx, wz],
          [wx, -wz],
          [-wx, -wz],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, WHEEL_R, z]} ref={(el) => {
            wheelRefs.current[i] = el
          }}>
          <mesh geometry={GEO.wheel} material={MAT.rubber} castShadow />
          <mesh geometry={GEO.hub} material={MAT.hub} />
          <mesh geometry={GEO.box} material={MAT.trim} scale={[0.28, 0.08, 0.5]} />
        </group>
      ))}
      {/* Anel de seleção / hover */}
      {(selected || hovered) && (
        <mesh geometry={GEO.ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <meshBasicMaterial color={selected ? '#38bdf8' : '#94a3b8'} transparent opacity={selected ? 0.95 : 0.5} toneMapped={false} />
        </mesh>
      )}
      {selected && (
        <Html position={[0, 2.6, 0]} center zIndexRange={[20, 0]}>
          <CarLabel id={id} />
        </Html>
      )}
    </group>
  )
}

export const Car3D = memo(Car3DInner)
