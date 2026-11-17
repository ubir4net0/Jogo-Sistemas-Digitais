/**
 * CameraController — OrbitControls com limites e transições suaves entre
 * enquadramentos predefinidos. Não interfere na simulação (apenas visual).
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useUi, type CameraPreset } from '../../store/uiStore'

type V3 = [number, number, number]

export const CAMERA_PRESETS: Record<CameraPreset, { pos: V3; target: V3; label: string }> = {
  iso: { pos: [19, 19, 25], target: [0, 0, 3.5], label: 'Isométrica' },
  top: { pos: [0, 46, 4.5], target: [0, 0, 4], label: 'Superior' },
  entry: { pos: [-21, 12, -3], target: [-11, 0.5, 10], label: 'Entrada' },
  exit: { pos: [21, 12, -3], target: [11, 0.5, 8.5], label: 'Saída' },
  overview: { pos: [0, 30, 44], target: [0, 0, 3], label: 'Visão geral' },
}

const TARGET_BOUNDS = { minX: -30, maxX: 30, minY: 0, maxY: 6, minZ: -20, maxZ: 24 }

/** Afasta a câmera em telas estreitas (retrato) para manter o cenário visível. */
function aspectFactor(aspect: number): number {
  if (aspect < 0.8) return 1.7
  if (aspect < 1.2) return 1.25
  if (aspect < 1.5) return 1.1
  return 1
}

function presetVectors(p: CameraPreset, aspect: number) {
  const { pos, target } = CAMERA_PRESETS[p]
  const t = new THREE.Vector3(...target)
  const off = new THREE.Vector3(...pos).sub(t).multiplyScalar(aspectFactor(aspect))
  return { pos: t.clone().add(off), target: t }
}

export function CameraController() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const request = useUi((s) => s.camera)
  const anim = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const firstRun = useRef(true)

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const v = presetVectors(request.preset, aspect)
    if (firstRun.current) {
      // Primeiro enquadramento: posiciona imediatamente.
      firstRun.current = false
      camera.position.copy(v.pos)
      controls.current?.target.copy(v.target)
      controls.current?.update()
      return
    }
    anim.current = v
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.nonce])

  useFrame((_, dt) => {
    const a = anim.current
    const c = controls.current
    if (!a || !c) return
    const k = 1 - Math.exp(-dt * 3.2)
    camera.position.lerp(a.pos, k)
    c.target.lerp(a.target, k)
    c.update()
    if (camera.position.distanceTo(a.pos) < 0.04 && c.target.distanceTo(a.target) < 0.04) anim.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={7}
      maxDistance={110}
      minPolarAngle={0.02}
      maxPolarAngle={1.4}
      zoomSpeed={0.9}
      rotateSpeed={0.7}
      panSpeed={0.8}
      target={CAMERA_PRESETS.iso.target}
      onStart={() => {
        anim.current = null
      }}
      onChange={() => {
        const c = controls.current
        if (!c) return
        const t = c.target
        const b = TARGET_BOUNDS
        const clamped = new THREE.Vector3(
          THREE.MathUtils.clamp(t.x, b.minX, b.maxX),
          THREE.MathUtils.clamp(t.y, b.minY, b.maxY),
          THREE.MathUtils.clamp(t.z, b.minZ, b.maxZ),
        )
        if (!clamped.equals(t)) t.copy(clamped)
        // Impede a câmera de descer abaixo do piso.
        if (camera.position.y < 1.5) camera.position.y = 1.5
      }}
    />
  )
}
