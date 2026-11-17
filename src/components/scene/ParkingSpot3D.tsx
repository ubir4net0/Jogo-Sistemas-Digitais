/**
 * ParkingSpot3D — vaga com demarcação, número, batente, indicador LED e
 * região clicável. A cor reflete o estado: livre (verde), reservada
 * (amarelo) ou ocupada (vermelho).
 */
import { memo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { GEO, MAT, labelTexture, ledMaterial } from './assets'
import { useSimulation } from '../../store/simulationStore'
import { useUi } from '../../store/uiStore'
import { SPOT_LENGTH, SPOT_WIDTH } from '../../engine/simulation/layout'
import type { SpotStatus } from '../../engine/simulation/types'

export const SPOT_COLOR: Record<SpotStatus, string> = {
  FREE: '#22c55e',
  RESERVED: '#facc15',
  OCCUPIED: '#ef4444',
}

function ParkingSpot3DInner({ index }: { index: number }) {
  const spot = useSimulation((s) => s.sim.spots[index])
  const selected = useUi((s) => s.selection?.kind === 'spot' && s.selection.id === spot.id)
  const hovered = useUi((s) => s.hovered === spot.id)
  const select = useUi((s) => s.select)
  const setHovered = useUi((s) => s.setHovered)

  const top = spot.row === 'top'
  // Direção do fundo da vaga (afastando-se do corredor).
  const back = top ? -1 : 1
  const color = SPOT_COLOR[spot.status]
  const label = labelTexture(spot.id, { width: 256, height: 128, color: '#e2e8f0' })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return
    if (spot.vehicleId) select({ kind: 'vehicle', id: spot.vehicleId })
    else select({ kind: 'spot', id: spot.id })
  }

  const lineW = 0.1
  return (
    <group position={[spot.x, 0, spot.z]}>
      {/* Linhas laterais */}
      <mesh geometry={GEO.box} material={MAT.line} position={[-SPOT_WIDTH / 2, 0.012, 0]} scale={[lineW, 0.01, SPOT_LENGTH]} />
      <mesh geometry={GEO.box} material={MAT.line} position={[SPOT_WIDTH / 2, 0.012, 0]} scale={[lineW, 0.01, SPOT_LENGTH]} />
      {/* Linha de fundo */}
      <mesh geometry={GEO.box} material={MAT.line} position={[0, 0.012, (back * SPOT_LENGTH) / 2]} scale={[SPOT_WIDTH + lineW, 0.01, lineW]} />
      {/* Preenchimento colorido / área clicável */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(spot.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(null)
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[SPOT_WIDTH - 0.2, SPOT_LENGTH - 0.15]} />
        <meshBasicMaterial
          color={selected ? '#38bdf8' : color}
          transparent
          opacity={selected ? 0.32 : hovered ? 0.24 : 0.1}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Número da vaga (próximo ao corredor) */}
      <mesh position={[0, 0.03, -back * (SPOT_LENGTH / 2 - 0.75)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.75]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Batente de roda */}
      <mesh geometry={GEO.box} material={MAT.curb} position={[0, 0.07, back * (SPOT_LENGTH / 2 - 0.45)]} scale={[1.7, 0.14, 0.22]} castShadow />
      {/* Faixa luminosa de estado */}
      <mesh geometry={GEO.box} material={ledMaterial(color, 2.2)} position={[0, 0.03, back * (SPOT_LENGTH / 2 - 0.12)]} scale={[SPOT_WIDTH - 0.5, 0.02, 0.12]} />
      {/* Sensor de vaga com LED (sinalização tipo "smart parking") */}
      <group position={[SPOT_WIDTH / 2 - 0.25, 0, back * (SPOT_LENGTH / 2 + 0.15)]}>
        <mesh geometry={GEO.cylinder} material={MAT.darkMetal} position={[0, 0.55, 0]} scale={[0.06, 1.1, 0.06]} />
        <mesh geometry={GEO.sphere} material={ledMaterial(color, 3)} position={[0, 1.15, 0]} scale={0.2} />
      </group>
    </group>
  )
}

export const ParkingSpot3D = memo(ParkingSpot3DInner)
