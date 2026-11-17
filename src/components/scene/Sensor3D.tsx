/**
 * Sensor3D — sensores de presença.
 *  • 'loop'  : laço indutivo no piso (SE, SS).
 *  • 'beam'  : barreira óptica com dois postes e feixe (P, PS).
 * O brilho reflete o sinal digital calculado pelo motor (0 ou 1).
 */
import { GEO, MAT, dimMaterial, labelTexture, ledMaterial } from './assets'
import { useSimulation } from '../../store/simulationStore'
import { SENSOR_ZONES } from '../../engine/simulation/layout'

type SensorName = keyof typeof SENSOR_ZONES

const ACTIVE = '#facc15'
const IDLE = '#38bdf8'

export function Sensor3D({ name, kind, labelSide = 1 }: { name: SensorName; kind: 'loop' | 'beam'; labelSide?: 1 | -1 }) {
  const active = useSimulation((s) => s.sim.signals[name] === 1)
  const z = SENSOR_ZONES[name]
  const cx = (z.minX + z.maxX) / 2
  const cz = (z.minZ + z.maxZ) / 2
  const w = z.maxX - z.minX
  const d = z.maxZ - z.minZ
  const mat = active ? ledMaterial(ACTIVE, 2.4) : dimMaterial(IDLE)
  const tag = labelTexture(`${name} = ${active ? 1 : 0}`, {
    width: 256,
    height: 96,
    background: active ? '#3b2f05' : '#0b1220',
    color: active ? '#fde047' : '#7dd3fc',
    border: active ? '#facc15' : '#1e3a5f',
  })
  const labelX = cx + labelSide * (w / 2 + 1.0)

  return (
    <group>
      {kind === 'loop' ? (
        <group position={[cx, 0.035, cz]}>
          {/* Contorno do laço indutivo */}
          <mesh geometry={GEO.box} material={mat} position={[0, 0, -d / 2 + 0.25]} scale={[w - 0.5, 0.02, 0.07]} />
          <mesh geometry={GEO.box} material={mat} position={[0, 0, d / 2 - 0.25]} scale={[w - 0.5, 0.02, 0.07]} />
          <mesh geometry={GEO.box} material={mat} position={[-w / 2 + 0.25, 0, 0]} scale={[0.07, 0.02, d - 0.5]} />
          <mesh geometry={GEO.box} material={mat} position={[w / 2 - 0.25, 0, 0]} scale={[0.07, 0.02, d - 0.5]} />
          <mesh geometry={GEO.box} material={mat} position={[0, 0, 0]} scale={[w - 0.5, 0.02, 0.05]} />
        </group>
      ) : (
        <group position={[cx, 0, cz]}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * (w / 2 + 0.15), 0, 0]}>
              <mesh geometry={GEO.box} material={MAT.darkMetal} position={[0, 0.45, 0]} scale={[0.14, 0.9, 0.14]} castShadow />
              <mesh geometry={GEO.box} material={mat} position={[0, 0.72, 0]} scale={[0.16, 0.1, 0.16]} />
            </group>
          ))}
          <mesh geometry={GEO.box} material={mat} position={[0, 0.72, 0]} scale={[w + 0.3, 0.025, 0.025]} />
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial color={active ? ACTIVE : IDLE} transparent opacity={active ? 0.16 : 0.05} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      )}
      {/* Etiqueta com o valor binário do sensor */}
      <mesh position={[labelX, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.56]} />
        <meshBasicMaterial map={tag} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}
