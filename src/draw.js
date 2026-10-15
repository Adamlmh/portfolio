import * as THREE from 'three'
import { rooms } from './content.js'

const FONT = '"Noto Serif SC", "Songti SC", "STSong", serif'

function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createCanvas(width, height) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return element
}

function paper(ctx, width, height, rand, tint = '#f3f0e8') {
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, width, height)
  const specks = Math.floor(width * height * 0.008)
  for (let i = 0; i < specks; i += 1) {
    ctx.fillStyle = `rgba(28, 28, 28, ${rand() * 0.08})`
    ctx.fillRect(rand() * width, rand() * height, rand() * 1.5 + 0.2, rand() * 1.5 + 0.2)
  }
}

function ink(ctx, width = 2) {
  ctx.strokeStyle = '#242424'
  ctx.fillStyle = '#242424'
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function scribble(ctx, x1, y1, x2, y2, rand, steps = 7) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const wobble = i === steps ? 0 : (rand() - 0.5) * 2.4
    ctx.lineTo(x1 + dx * t + (-dy / length) * wobble, y1 + dy * t + (dx / length) * wobble)
  }
  ctx.stroke()
}

function toTexture(element, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(element)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.needsUpdate = true
  return texture
}

function drawBrick() {
  const rand = makeRng(11)
  const element = createCanvas(1024, 1024)
  const ctx = element.getContext('2d')
  paper(ctx, 1024, 1024, rand, '#f7f4ee')
  ink(ctx, 2)
  const brickW = 92
  const brickH = 40
  for (let row = 0; row < 28; row += 1) {
    const y = row * brickH
    const offset = row % 2 === 0 ? 0 : brickW / 2
    scribble(ctx, 0, y, 1024, y + (rand() - 0.5) * 2, rand, 10)
    for (let x = -brickW; x < 1100; x += brickW) {
      scribble(ctx, x + offset, y, x + offset, y + brickH, rand, 3)
    }
  }
  return toTexture(element, 2.4, 1.6)
}

function drawPlaster() {
  const rand = makeRng(19)
  const element = createCanvas(1024, 512)
  const ctx = element.getContext('2d')
  paper(ctx, 1024, 512, rand, '#f6f3ec')
  ink(ctx, 1.5)
  for (let i = 0; i < 7; i += 1) {
    const x = 40 + rand() * 940
    const y = 30 + rand() * 360
    scribble(ctx, x, y, x + 30 + rand() * 80, y + (rand() - 0.5) * 18, rand, 4)
  }
  ink(ctx, 3)
  scribble(ctx, 0, 468, 1024, 470, rand, 12)
  ink(ctx, 1.5)
  scribble(ctx, 0, 456, 1024, 458, rand, 12)
  return toTexture(element, 7, 1)
}

function drawWood() {
  const rand = makeRng(29)
  const element = createCanvas(512, 1024)
  const ctx = element.getContext('2d')
  paper(ctx, 512, 1024, rand, '#f6f3ec')
  ink(ctx, 1.6)
  for (let x = 8; x < 512; x += 46) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + (rand() - 0.5) * 1.5, 1024)
    ctx.stroke()
  }
  ink(ctx, 1)
  ctx.globalAlpha = 0.55
  for (let i = 0; i < 10; i += 1) {
    const x = 20 + rand() * 470
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.bezierCurveTo(x + 4, 340, x - 4, 680, x + 2, 1024)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  return toTexture(element, 4, 8)
}

function drawCeiling() {
  const rand = makeRng(41)
  const element = createCanvas(512, 512)
  const ctx = element.getContext('2d')
  paper(ctx, 512, 512, rand, '#f7f5f0')
  ink(ctx, 1.4)
  for (let y = 0; y <= 512; y += 128) {
    scribble(ctx, 0, y, 512, y, rand, 8)
  }
  for (let x = 0; x <= 512; x += 128) {
    scribble(ctx, x, 0, x, 512, rand, 8)
  }
  return toTexture(element, 4, 8)
}

function drawGround() {
  const rand = makeRng(53)
  const element = createCanvas(1024, 1024)
  const ctx = element.getContext('2d')
  paper(ctx, 1024, 1024, rand, '#f3f0e8')
  ink(ctx, 2)
  for (let i = 0; i < 16; i += 1) {
    const x = 360 + rand() * 300
    const y = rand() * 980
    const w = 70 + rand() * 50
    const h = 40 + rand() * 28
    ctx.beginPath()
    ctx.ellipse(x, y, w / 2, h / 2, rand() * 0.4, 0, Math.PI * 2)
    ctx.stroke()
  }
  return toTexture(element, 1, 1)
}

function drawSign(title, subtitle) {
  const rand = makeRng(title.length * 17)
  const element = createCanvas(1024, 320)
  const ctx = element.getContext('2d')
  ctx.clearRect(0, 0, 1024, 320)
  paper(ctx, 1024, 320, rand, '#f7f4ee')
  ink(ctx, 8)
  ctx.strokeRect(18, 18, 988, 284)
  ink(ctx, 2)
  ctx.strokeRect(36, 36, 952, 248)
  ctx.fillStyle = '#242424'
  ctx.font = `700 132px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 512, subtitle ? 130 : 160)
  if (subtitle) {
    ctx.font = `600 48px ${FONT}`
    ctx.fillText(subtitle, 512, 230)
  }
  ctx.fillStyle = '#242424'
  ctx.beginPath()
  ctx.arc(70, 70, 8, 0, Math.PI * 2)
  ctx.arc(954, 70, 8, 0, Math.PI * 2)
  ctx.fill()
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function drawDoor(note) {
  const rand = makeRng(note.charCodeAt(0) * 13)
  const element = createCanvas(512, 1024)
  const ctx = element.getContext('2d')
  paper(ctx, 512, 1024, rand, '#fbf9f4')
  ink(ctx, 8)
  ctx.strokeRect(24, 24, 464, 976)
  ink(ctx, 3)
  ctx.strokeRect(58, 58, 396, 430)
  ctx.strokeRect(58, 520, 396, 430)
  ink(ctx, 2)
  scribble(ctx, 90, 680, 420, 684, rand, 4)
  scribble(ctx, 90, 820, 420, 816, rand, 4)
  ctx.beginPath()
  ctx.arc(390, 512, 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(406, 512)
  ctx.lineTo(448, 512)
  ctx.stroke()

  ctx.save()
  ctx.translate(150, 250)
  ctx.rotate(-0.08)
  ctx.fillStyle = '#f3d56a'
  ctx.fillRect(0, 0, 180, 180)
  ink(ctx, 2)
  ctx.strokeRect(0, 0, 180, 180)
  ctx.fillStyle = '#242424'
  ctx.font = `700 64px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(note, 90, 90)
  ctx.restore()

  const stickers = [
    { label: 'JS', x: 300, y: 180, color: '#f3d56a' },
    { label: 'TS', x: 340, y: 300, color: '#d9e4f5' },
    { label: 'Re', x: 250, y: 390, color: '#f6c1c1' },
    { label: 'Go', x: 360, y: 430, color: '#d7ead8' },
  ]
  stickers.forEach((sticker) => {
    ctx.beginPath()
    ctx.fillStyle = sticker.color
    ctx.arc(sticker.x, sticker.y, 42, 0, Math.PI * 2)
    ctx.fill()
    ink(ctx, 2)
    ctx.stroke()
    ctx.fillStyle = '#242424'
    ctx.font = `700 28px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(sticker.label, sticker.x, sticker.y)
  })
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function drawFrame(text) {
  const rand = makeRng(text.length * 23)
  const element = createCanvas(1024, 640)
  const ctx = element.getContext('2d')
  paper(ctx, 1024, 640, rand, '#f7f4ee')
  ink(ctx, 10)
  ctx.strokeRect(28, 28, 968, 584)
  ink(ctx, 2)
  ctx.strokeRect(58, 58, 908, 524)
  ctx.fillStyle = '#242424'
  ctx.font = `600 54px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = wrapText(ctx, text, 760)
  const start = 320 - ((lines.length - 1) * 72) / 2
  lines.forEach((line, index) => {
    ctx.fillText(line, 512, start + index * 72)
  })
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function wrapText(ctx, text, maxWidth) {
  const lines = []
  let current = ''
  for (const char of text) {
    const next = current + char
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = char
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawGlyph(char) {
  const element = createCanvas(512, 512)
  const ctx = element.getContext('2d')
  ctx.clearRect(0, 0, 512, 512)
  ctx.font = `700 300px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1c1c1c'
  ctx.fillText(char, 256, 268)
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function drawLamp() {
  const element = createCanvas(512, 96)
  const ctx = element.getContext('2d')
  ctx.fillStyle = '#f7f4ee'
  ctx.fillRect(0, 0, 512, 96)
  ink(ctx, 4)
  ctx.strokeRect(8, 16, 496, 64)
  ink(ctx, 2)
  for (let x = 28; x < 490; x += 36) {
    ctx.beginPath()
    ctx.moveTo(x, 20)
    ctx.lineTo(x, 76)
    ctx.stroke()
  }
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function drawWindow() {
  const rand = makeRng(71)
  const element = createCanvas(512, 512)
  const ctx = element.getContext('2d')
  paper(ctx, 512, 512, rand, '#f7f4ee')
  ink(ctx, 8)
  ctx.strokeRect(24, 24, 464, 464)
  ink(ctx, 3)
  ctx.beginPath()
  ctx.moveTo(256, 24)
  ctx.lineTo(256, 488)
  ctx.moveTo(24, 256)
  ctx.lineTo(488, 256)
  ctx.stroke()
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function drawRole() {
  const element = createCanvas(1024, 256)
  const ctx = element.getContext('2d')
  ctx.clearRect(0, 0, 1024, 256)
  ctx.fillStyle = '#1c1c1c'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 72px ${FONT}`
  ctx.fillText('即梦实习生', 512, 80)
  ctx.font = `600 48px ${FONT}`
  ctx.fillText('做 AI 全栈', 512, 170)
  const texture = toTexture(element)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export function buildMaps() {
  const doors = {
    outside: drawDoor('请进'),
  }
  const signs = {
    outside: drawSign('丘俊凯', '点门进来'),
  }
  const frames = {
    end: drawFrame('GitHub 上见'),
  }
  rooms.forEach((room) => {
    doors[room.id] = drawDoor(room.note)
    signs[room.id] = drawSign(room.sign)
    frames[room.id] = drawFrame(room.quote)
  })
  return {
    brick: drawBrick(),
    plaster: drawPlaster(),
    wood: drawWood(),
    ceiling: drawCeiling(),
    ground: drawGround(),
    lamp: drawLamp(),
    window: drawWindow(),
    role: drawRole(),
    glyphs: ['丘', '俊', '凯'].map((char) => drawGlyph(char)),
    doors,
    signs,
    frames,
  }
}
