/**
 * Gate3D — cancela com gabinete, haste listrada que gira em torno de um pivô
 * real e LED de estado. O ângulo vem do motor (estado da cancela).
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GEO, MAT, dimMaterial, labelTexture, ledMaterial } from './assets'
import { getSim, useSimulation } from '../../store/simulationStore'
import { entryLight, exitLight, gateDisplay, type LightColor } from '../../engine/simulation/derived'

const ARM_LENGTH = 3.45
const MAX_ANGLE = Math.PI * 0.47
const SEGMENTS = 6

const LED_COLOR = { CLOSED: '#ef4444', OPENING: '#facc15', OPEN: '#22c55e', CLOSING: '#facc15', BLOCKED: '#f97316' } as const

interface GateProps {
  which: 'entry' | 'exit'
  position: [number, number, number]
  /** +1: haste se estende para +X; −1: para −X. */
  direction: 1 | -1
}

export function Gate3D({ which, position, direction }: GateProps) {
  const pivot = useRef<THREE.Group>(null)
  const led = useRef<THREE.Mesh>(null)
  const display = useSimulation((s) => gateDisplay(s.sim, which))

  useFrame(({ clock }) => {
    const g = getSim().gates[which]
    if (pivot.current) pivot.current.rotation.z = direction * g.angle * MAX_ANGLE
    if (led.current) {
      const blink = display === 'BLOCKED' || display === 'OPENING' || display === 'CLOSING'
      led.current.visible = !blink || Math.sin(clock.elapsedTime * 9) > -0.2
    }
  })

  const segLen = ARM_LENGTH / SEGMENTS
  return (
    <group position={position}>
      {/* Base de concreto */}
      <mesh geometry={GEO.box} material={MAT.curb} position={[0, 0.06, 0]} scale={[0.9, 0.12, 0.9]} receiveShadow />
      {/* Gabinete do motor */}
      <mesh geometry={GEO.box} material={MAT.gateBody} position={[0, 0.62, 0]} scale={[0.55, 1.05, 0.55]} castShadow />
      <mesh geometry={GEO.box} material={MAT.gateYellow} position={[0, 1.17, 0]} scale={[0.6, 0.06, 0.6]} castShadow />
      <mesh geometry={GEO.box} material={MAT.gateYellow} position={[0, 0.35, 0.281]} scale={[0.5, 0.08, 0.01]} />
      <mesh geometry={GEO.box} material={MAT.gateYellow} position={[0, 0.55, 0.281]} scale={[0.5, 0.08, 0.01]} />
      {/* LED de estado */}
      <mesh ref={led} geometry={GEO.sphere} material={ledMaterial(LED_COLOR[display], 3)} position={[0, 1.3, 0]} scale={0.2} />
      {/* Pivô + haste */}
      <group ref={pivot} position={[direction * 0.2, 1.0, 0]}>
        <mesh geometry={GEO.cylinder} material={MAT.metal} rotation={[Math.PI / 2, 0, 0]} scale={[0.16, 0.66, 0.16]} />
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <mesh
            key={i}
            geometry={GEO.box}
            material={i % 2 === 0 ? MAT.armRed : MAT.armWhite}
            position={[direction * (segLen * i + segLen / 2 + 0.08), 0, 0]}
            scale={[segLen, 0.1, 0.09]}
            castShadow
          />
        ))}
        <mesh geometry={GEO.sphere} material={ledMaterial('#ef4444', 2.5)} position={[direction * (ARM_LENGTH + 0.05), 0, 0]} scale={0.1} />
      </group>
    </group>
  )
}

const LAMP_ORDER: LightColor[] = ['red', 'yellow', 'green']
const LAMP_HEX: Record<LightColor, string> = { red: '#ef4444', yellow: '#facc15', green: '#22c55e' }

export function TrafficLight({ which, position, rotationY }: { which: 'entry' | 'exit'; position: [number, number, number]; rotationY: number }) {
  const color = useSimulation((s) => (which === 'entry' ? entryLight(s.sim) : exitLight(s.sim)))
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[0, 1.2, 0]} scale={[0.09, 2.4, 0.09]} castShadow />
      <mesh geometry={GEO.box} material={MAT.trim} position={[0, 2.75, 0]} scale={[0.36, 0.95, 0.26]} castShadow />
      {LAMP_ORDER.map((c, i) => (
        <mesh
          key={c}
          geometry={GEO.sphere}
          material={c === color ? ledMaterial(LAMP_HEX[c], 3.2) : dimMaterial(LAMP_HEX[c])}
          position={[0, 3.05 - i * 0.29, 0.13]}
          scale={0.21}
        />
      ))}
    </group>
  )
}

/** Placa fixa de identificação (ENTRADA / SAÍDA). */
export function GateSign({ text, position, rotationY, color }: { text: string; position: [number, number, number]; rotationY: number; color: string }) {
  const tex = labelTexture(text, { width: 512, height: 128, background: '#0b1220', color, border: color })
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[-0.9, 1.1, 0]} scale={[0.07, 2.2, 0.07]} />
      <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[0.9, 1.1, 0]} scale={[0.07, 2.2, 0.07]} />
      <mesh position={[0, 2.25, 0.04]}>
        <planeGeometry args={[2.2, 0.55]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh geometry={GEO.box} material={MAT.trim} position={[0, 2.25, -0.01]} scale={[2.3, 0.65, 0.06]} />
    </group>
  )
}
