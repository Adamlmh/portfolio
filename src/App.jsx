import { useCallback, useEffect, useRef, useState } from 'react'
import World from './scene/World.jsx'
import { Boot, Chrome } from './ui/Chrome.jsx'

export default function App() {
  const worldRef = useRef(null)
  const [booting, setBooting] = useState(true)
  const [progress, setProgress] = useState(0)
  const [sceneReady, setSceneReady] = useState(false)
  const [place, setPlace] = useState('outside')
  const [openId, setOpenId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const onReady = useCallback(() => {
    setSceneReady(true)
  }, [])

  const onPlace = useCallback((next) => {
    setPlace(next)
  }, [])

  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const tick = (now) => {
      const linear = (now - started) / 1500
      const cap = sceneReady ? 1 : 0.9
      const next = Math.min(cap, linear)
      setProgress(next)
      if (next < 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      setBooting(false)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [sceneReady])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpenId(null)
        setMenuOpen(false)
        return
      }
      if (event.target instanceof Element && event.target.closest('input, textarea, a')) return
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        event.preventDefault()
        worldRef.current?.nudge(-3.2)
      } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        event.preventDefault()
        worldRef.current?.nudge(3.2)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (place === 'outside') worldRef.current?.enter()
        else worldRef.current?.activate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [place])

  const openRoom = (id) => {
    setMenuOpen(false)
    setOpenId(id)
    worldRef.current?.go(id)
  }

  return (
    <div className="app">
      <World
        ref={worldRef}
        openId={openId}
        onOpen={openRoom}
        onPlace={onPlace}
        onReady={onReady}
      />
      {booting ? <Boot progress={progress} /> : null}
      <Chrome
        place={place}
        openId={openId}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onActivate={() => {
          if (place === 'outside') worldRef.current?.enter()
          else worldRef.current?.activate()
        }}
        onHome={() => {
          setOpenId(null)
          setMenuOpen(false)
          worldRef.current?.home()
        }}
        onNudge={(amount) => worldRef.current?.nudge(amount)}
        onGo={(id) => {
          setOpenId(null)
          setMenuOpen(false)
          worldRef.current?.go(id)
        }}
        onOpen={openRoom}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}
