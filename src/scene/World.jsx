import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { LOBBY_Z, MIN_Z, OUTSIDE_Z, rooms, standZ } from '../content.js'
import { buildMaps } from '../draw.js'

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const World = forwardRef(function World({ openId, onOpen, onPlace, onReady }, ref) {
  const [maps, setMaps] = useState(null)
  const api = useRef({
    targetZ: OUTSIDE_Z,
    entered: false,
  })

  useImperativeHandle(ref, () => ({
    enter() {
      api.current.entered = true
      api.current.targetZ = LOBBY_Z
    },
    home() {
      api.current.entered = false
      api.current.targetZ = OUTSIDE_Z
    },
    nudge(amount) {
      if (!api.current.entered) {
        api.current.entered = true
        api.current.targetZ = LOBBY_Z
        return
      }
      api.current.targetZ = clamp(api.current.targetZ + amount, MIN_Z, OUTSIDE_Z)
    },
    go(id) {
      if (id === 'outside') {
        api.current.entered = false
        api.current.targetZ = OUTSIDE_Z
        return
      }
      api.current.entered = true
      if (id === 'lobby') {
        api.current.targetZ = LOBBY_Z
        return
      }
      const room = rooms.find((item) => item.id === id)
      if (room) api.current.targetZ = standZ(room)
    },
    activate() {
      if (!api.current.entered) {
        api.current.entered = true
        api.current.targetZ = LOBBY_Z
        return
      }
      const found = closestRoom(api.current.targetZ)
      if (found && found.dist < 3.4) onOpen(found.room.id)
    },
  }))

  useEffect(() => {
    let cancelled = false
    const prepare = async () => {
      try {
        await Promise.race([
          document.fonts.load('700 72px "Noto Serif SC"'),
          new Promise((resolve) => {
            window.setTimeout(resolve, 2200)
          }),
        ])
      } catch {
        // 字体加载失败时退回系统宋体，走廊仍然可以走。
      }
      if (!cancelled) {
        setMaps(buildMaps())
        onReady()
      }
    }
    prepare()
    return () => {
      cancelled = true
    }
  }, [onReady])

  return (
    <Canvas
      camera={{ position: [0, 1.52, OUTSIDE_Z], fov: 48, near: 0.1, far: 80 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#efece6')
        gl.toneMapping = THREE.NoToneMapping
      }}
    >
      <fog attach="fog" args={['#efece6', 9, 24]} />
      {maps ? (
        <Scene
          api={api}
          maps={maps}
          openId={openId}
          onOpen={onOpen}
          onPlace={onPlace}
        />
      ) : null}
    </Canvas>
  )
})

export default World

function Scene({ api, maps, openId, onOpen, onPlace }) {
  const look = useRef({ x: 0, y: 0 })
  const placeRef = useRef('')

  useEffect(() => {
    const onMove = (event) => {
      look.current.x = (event.clientX / window.innerWidth - 0.5) * 2
      look.current.y = (event.clientY / window.innerHeight - 0.5) * 2
    }
    let dragging = false
    let lastY = 0
    let moved = 0
    const onDown = (event) => {
      if (event.target.closest('.ui')) return
      dragging = true
      lastY = event.clientY
      moved = 0
    }
    const onPointerMove = (event) => {
      if (!dragging || !api.current.entered) return
      const delta = event.clientY - lastY
      lastY = event.clientY
      moved += Math.abs(delta)
      if (moved < 8) return
      api.current.targetZ = clamp(api.current.targetZ + delta * 0.018, MIN_Z, OUTSIDE_Z)
    }
    const onUp = () => {
      dragging = false
    }
    const onWheel = (event) => {
      if (!api.current.entered) return
      if (event.target.closest('.sheet')) return
      event.preventDefault()
      const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 90)
      api.current.targetZ = clamp(api.current.targetZ - delta * 0.014, MIN_Z, OUTSIDE_Z)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('wheel', onWheel)
    }
  }, [api])

  return (
    <>
      <Rig
        api={api}
        look={look}
        onPlace={onPlace}
        placeRef={placeRef}
      />
      <Exterior
        maps={maps}
        api={api}
        onEnter={() => {
          api.current.entered = true
          api.current.targetZ = LOBBY_Z
        }}
      />
      <Corridor maps={maps} openId={openId} onOpen={onOpen} />
      <Lobby maps={maps} />
    </>
  )
}

function closestRoom(z) {
  let best = null
  rooms.forEach((room) => {
    const dist = Math.abs(z - standZ(room))
    if (!best || dist < best.dist) best = { room, dist }
  })
  return best
}

function Rig({ api, look, onPlace, placeRef }) {
  const { camera } = useThree()
  const lookAt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const lambda = reduceMotion ? 16 : 3.2
    camera.position.z = THREE.MathUtils.damp(camera.position.z, api.current.targetZ, lambda, dt)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, look.current.x * 0.22, 2.4, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.52 - look.current.y * 0.05, 2.4, dt)
    const outside = THREE.MathUtils.smoothstep(camera.position.z, 0.4, 3.5)
    lookAt.set(
      camera.position.x * 0.2,
      1.46 + outside * 0.18,
      camera.position.z - 6,
    )
    camera.lookAt(lookAt)

    let next = 'outside'
    if (api.current.entered && camera.position.z < 1.2) {
      const found = closestRoom(camera.position.z)
      if (found && found.dist < 3.2) next = found.room.id
      else next = 'lobby'
    }
    if (next !== placeRef.current) {
      placeRef.current = next
      onPlace(next)
    }
  })
  return null
}

function Exterior({ maps, api, onEnter }) {
  const pivot = useRef(null)
  const angle = useRef(0)
  const leftBrick = useMemo(() => {
    const texture = maps.brick.clone()
    texture.repeat.set(2.2, 1.5)
    return texture
  }, [maps.brick])
  const rightBrick = useMemo(() => {
    const texture = maps.brick.clone()
    texture.repeat.set(2.2, 1.5)
    return texture
  }, [maps.brick])
  const lintel = useMemo(() => {
    const texture = maps.brick.clone()
    texture.repeat.set(0.7, 0.7)
    return texture
  }, [maps.brick])
  useFrame((_, dt) => {
    const target = api.current.entered ? -1.35 : 0
    angle.current = THREE.MathUtils.damp(angle.current, target, reduceMotion ? 14 : 4, dt)
    if (pivot.current) pivot.current.rotation.y = angle.current
  })

  return (
    <group>
      <mesh position={[-4.15, 2.15, 0]}>
        <planeGeometry args={[7.3, 4.5]} />
        <meshBasicMaterial map={leftBrick} />
      </mesh>
      <mesh position={[4.15, 2.15, 0]}>
        <planeGeometry args={[7.3, 4.5]} />
        <meshBasicMaterial map={rightBrick} />
      </mesh>
      <mesh position={[0, 3.42, 0]}>
        <planeGeometry args={[1.7, 1.96]} />
        <meshBasicMaterial map={lintel} />
      </mesh>
      <mesh position={[0, 2.72, 0.04]}>
        <planeGeometry args={[2.3, 0.72]} />
        <meshBasicMaterial map={maps.signs.outside} transparent />
      </mesh>
      <mesh position={[2.35, 1.85, 0.03]}>
        <planeGeometry args={[1.55, 1.55]} />
        <meshBasicMaterial map={maps.window} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 4.2]}>
        <planeGeometry args={[14, 10]} />
        <meshBasicMaterial map={maps.ground} />
      </mesh>
      <group position={[-0.82, 0, 0.08]}>
        <group ref={pivot}>
          <mesh
            position={[0.82, 1.16, 0]}
            onClick={(event) => {
              event.stopPropagation()
              onEnter()
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = ''
            }}
          >
            <planeGeometry args={[1.64, 2.32]} />
            <meshBasicMaterial map={maps.doors.outside} />
          </mesh>
        </group>
      </group>
      <Plant position={[-2.15, 0, 1.15]} />
      <Pencil position={[1.55, 0.02, 2.35]} />
    </group>
  )
}

function Corridor({ maps, openId, onOpen }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -27]}>
        <planeGeometry args={[6.5, 56]} />
        <meshBasicMaterial map={maps.wood} />
      </mesh>
      <mesh position={[-3.25, 1.6, -27]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[56, 3.2]} />
        <meshBasicMaterial map={maps.plaster} />
      </mesh>
      <mesh position={[3.25, 1.6, -27]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[56, 3.2]} />
        <meshBasicMaterial map={maps.plaster} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.2, -27]}>
        <planeGeometry args={[6.5, 56]} />
        <meshBasicMaterial map={maps.ceiling} />
      </mesh>
      <mesh position={[0, 1.6, -55]}>
        <planeGeometry args={[6.5, 3.2]} />
        <meshBasicMaterial map={maps.plaster} />
      </mesh>
      <mesh
        position={[0, 1.7, -54.9]}
        onClick={() => {
          window.open('https://github.com/Adamlmh', '_blank', 'noopener')
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[2.4, 1.5]} />
        <meshBasicMaterial map={maps.frames.end} />
      </mesh>
      {rooms.map((room) => (
        <RoomDoor key={room.id} room={room} maps={maps} open={openId === room.id} onOpen={onOpen} />
      ))}
      {[-8, -18, -28, -38, -48].map((z) => (
        <mesh key={z} position={[0, 3.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.28]} />
          <meshBasicMaterial map={maps.lamp} />
        </mesh>
      ))}
    </group>
  )
}

function RoomDoor({ room, maps, open, onOpen }) {
  const pivot = useRef(null)
  const angle = useRef(0)
  useFrame((_, dt) => {
    angle.current = THREE.MathUtils.damp(angle.current, open ? 1.2 : 0, reduceMotion ? 14 : 5, dt)
    if (pivot.current) pivot.current.rotation.y = angle.current * room.side
  })
  const hingeZ = room.z - 0.62
  const wallX = room.side * -3.16
  return (
    <group>
      <group position={[wallX, 0, hingeZ]}>
        <group ref={pivot}>
          <mesh
            position={[0, 1.16, 0.62]}
            rotation={[0, room.side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
            onClick={(event) => {
              event.stopPropagation()
              onOpen(room.id)
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = ''
            }}
          >
            <planeGeometry args={[1.24, 2.32]} />
            <meshBasicMaterial map={maps.doors[room.id]} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      <mesh
        position={[room.side * -3.12, 2.62, room.z]}
        rotation={[0, room.side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
      >
        <planeGeometry args={[1.35, 0.42]} />
        <meshBasicMaterial map={maps.signs[room.id]} transparent />
      </mesh>
      <mesh
        position={[room.side * 3.12, 1.7, room.z + 3.2]}
        rotation={[0, room.side === -1 ? -Math.PI / 2 : Math.PI / 2, 0]}
      >
        <planeGeometry args={[2.15, 1.34]} />
        <meshBasicMaterial map={maps.frames[room.id]} />
      </mesh>
    </group>
  )
}

function Lobby({ maps }) {
  const group = useRef(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = 1.78 + Math.sin(clock.elapsedTime * 0.8) * 0.04
  })
  return (
    <group>
      <group ref={group} position={[0, 1.78, -6.4]}>
        {maps.glyphs.map((glyph, index) => (
          <mesh key={index} position={[(index - 1) * 1.05, 0, 0]}>
            <planeGeometry args={[0.98, 0.98]} />
            <meshBasicMaterial map={glyph} transparent depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.05, -6.3]}>
        <planeGeometry args={[2.8, 0.7]} />
        <meshBasicMaterial map={maps.role} transparent depthWrite={false} />
      </mesh>
      <Doodles />
      <mesh position={[0, 3.05, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.32]} />
        <meshBasicMaterial map={maps.lamp} />
      </mesh>
    </group>
  )
}

function Doodles() {
  const group = useRef(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.08
  })
  return (
    <group ref={group} position={[0, 1.8, -3.4]}>
      <Line
        points={[[1.7, 0.55, 0], [2.15, 0.72, 0], [1.72, 0.84, 0], [1.7, 0.55, 0]]}
        color="#242424"
        lineWidth={1}
      />
      <Line points={[[-1.8, 0.7, 0.2], [-1.55, 0.95, 0.2], [-1.8, 1.15, 0.2], [-2.05, 0.95, 0.2], [-1.8, 0.7, 0.2]]} color="#242424" lineWidth={1} />
      <Line points={[[2.1, -0.15, 0.4], [2.45, -0.55, 0.55]]} color="#242424" lineWidth={1} />
      <Line points={[[2.28, -0.35, 0.48], [2.55, -0.28, 0.5]]} color="#242424" lineWidth={1} />
    </group>
  )
}

function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.28, 8]} />
        <meshBasicMaterial color="#f7f4ee" />
      </mesh>
      <Line points={[[-0.16, 0.02, 0.16], [0.16, 0.02, 0.16], [0.14, 0.3, 0.14], [-0.14, 0.3, 0.14], [-0.16, 0.02, 0.16]]} color="#242424" lineWidth={1} />
      <Line points={[[0, 0.3, 0], [0.05, 0.85, 0], [-0.22, 1.15, 0.04]]} color="#242424" lineWidth={1} />
      <Line points={[[0.04, 0.62, 0], [0.32, 0.86, 0.05]]} color="#242424" lineWidth={1} />
      <Line points={[[0.02, 0.7, 0], [-0.28, 0.95, -0.02]]} color="#242424" lineWidth={1} />
    </group>
  )
}

function Pencil({ position }) {
  return (
    <group position={position} rotation={[0, 0.4, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 6]} />
        <meshBasicMaterial color="#f3d56a" />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.04, 0.16, 6]} />
        <meshBasicMaterial color="#242424" />
      </mesh>
    </group>
  )
}
