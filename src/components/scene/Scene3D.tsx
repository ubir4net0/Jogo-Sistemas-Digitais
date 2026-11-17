/**
 * Scene3D — Canvas WebGL do gêmeo digital. Monta iluminação, cenário,
 * vagas, sensores, cancelas, semáforos e veículos.
 */
import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import { AlertTriangle } from 'lucide-react'
import { COLORS } from './assets'
import { ParkingEnvironment } from './ParkingEnvironment'
import { ParkingSpot3D } from './ParkingSpot3D'
import { Gate3D, GateSign, TrafficLight } from './Gate3D'
import { Sensor3D } from './Sensor3D'
import { Car3D } from './Car3D'
import { CameraController, CAMERA_PRESETS } from './CameraController'
import { useSimulation } from '../../store/simulationStore'
import { useUi } from '../../store/uiStore'
import { ENTRY_LANE_X, EXIT_LANE_X, GATE_LINE_Z } from '../../engine/simulation/layout'

function Vehicles() {
  const ids = useSimulation(useShallow((s) => s.sim.vehicles.map((v) => v.id)))
  return (
    <>
      {ids.map((id) => (
        <Car3D key={id} id={id} />
      ))}
    </>
  )
}

function Spots() {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <ParkingSpot3D key={i} index={i} />
      ))}
    </>
  )
}

function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <hemisphereLight args={['#bcd7ff', '#1a1f29', 0.65]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[20, 32, 14]}
        intensity={1.9}
        color="#fff4e0"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-18, 14, -10]} intensity={0.35} color="#7aa7ff" />
      <pointLight position={[ENTRY_LANE_X, 4, 9]} intensity={14} distance={12} color="#9cc8ff" />
      <pointLight position={[EXIT_LANE_X, 4, 9]} intensity={14} distance={12} color="#9cc8ff" />
    </>
  )
}

export function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function WebGLUnavailable({ detail }: { detail?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0f14] p-6">
      <div className="max-w-md rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <h3 className="mb-2 text-lg font-semibold text-amber-200">WebGL indisponível</h3>
        <p className="text-sm text-slate-300">
          Este navegador ou dispositivo não conseguiu inicializar a aceleração gráfica (WebGL) necessária para a cena 3D.
          O motor lógico, o painel de controle e o Laboratório Digital continuam funcionando normalmente.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Dica: ative a aceleração por hardware nas configurações do navegador ou utilize Chrome, Edge ou Firefox atualizados.
        </p>
        {detail && <p className="mt-3 font-mono text-[11px] text-slate-500">{detail}</p>}
      </div>
    </div>
  )
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
  render() {
    if (this.state.error) return <WebGLUnavailable detail={this.state.error} />
    return this.props.children
  }
}

export function Scene3D() {
  const quality = useUi((s) => s.quality)
  const select = useUi((s) => s.select)
  const hasWebGL = useMemo(() => detectWebGL(), [])
  const down = useRef<{ x: number; y: number } | null>(null)
  const high = quality === 'high'

  if (!hasWebGL) return <WebGLUnavailable />

  return (
    <SceneErrorBoundary>
      <div
        className="h-full w-full touch-none"
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY }
        }}
      >
        <Canvas
          key={quality}
          shadows={high ? 'soft' : false}
          dpr={high ? [1, 1.75] : [0.75, 1]}
          gl={{ antialias: high, powerPreference: 'high-performance' }}
          camera={{ position: CAMERA_PRESETS.iso.pos, fov: 42, near: 0.5, far: 260 }}
          onPointerMissed={(e) => {
            const d = down.current
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) select(null)
          }}
        >
          <color attach="background" args={[COLORS.background]} />
          <fog attach="fog" args={[COLORS.background, 70, 150]} />
          <Lights shadows={high} />
          <Suspense fallback={null}>
            <ParkingEnvironment />
            <Spots />
            <Sensor3D name="SE" kind="loop" labelSide={1} />
            <Sensor3D name="P" kind="beam" labelSide={1} />
            <Sensor3D name="SS" kind="loop" labelSide={-1} />
            <Sensor3D name="PS" kind="beam" labelSide={-1} />
            <Gate3D which="entry" position={[ENTRY_LANE_X - 2.1, 0, GATE_LINE_Z]} direction={1} />
            <Gate3D which="exit" position={[EXIT_LANE_X + 2.1, 0, GATE_LINE_Z]} direction={-1} />
            <TrafficLight which="entry" position={[ENTRY_LANE_X - 2.25, 0, GATE_LINE_Z + 1.25]} rotationY={0} />
            <TrafficLight which="exit" position={[EXIT_LANE_X + 2.25, 0, GATE_LINE_Z - 1.4]} rotationY={Math.PI} />
            <GateSign text="ENTRADA" position={[-7.4, 0, 9.1]} rotationY={0} color="#22c55e" />
            <GateSign text="SAÍDA" position={[7.4, 0, 9.1]} rotationY={0} color="#f87171" />
            <Vehicles />
          </Suspense>
          <CameraController />
        </Canvas>
      </div>
    </SceneErrorBoundary>
  )
}
