// Renders SVG sources to all icon assets the project ships:
//   - build/icon.ico        multi-frame (16,24,32,48,64,256), Windows + NSIS
//   - build/icon.png        512x512, Linux / cross-platform
//   - resources/icon.{ico,png}                      BrowserWindow icon
//   - resources/icon_on.{ico,png}                   tray, processes running
//   - resources/icon_off.{ico,png}                  tray, processes idle
//   - src/renderer/src/assets/logo.png              sidebar logo (dark theme)
//   - src/renderer/src/assets/logo_white.png        sidebar logo (light theme)
//
// Every PNG is rendered straight from the SVG vector at the exact target
// resolution — no upscaling, no downscaling-from-bitmap. The .ico files are
// assembled as proper multi-frame icons so Windows can pick the right size
// for tray (16/20/24), Explorer (32), Aero Peek (256), etc.
//
// Run with: npm run icons:rebuild
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const projectRoot = resolve(fileURLToPath(import.meta.url), '..', '..')
const designRoot = resolve(projectRoot, '..', 'design')

/** Render an SVG buffer to a PNG buffer at the given square size. */
function svgToPng(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

/**
 * Pack one or more PNG buffers into a multi-frame ICO file.
 * Each frame is stored as a PNG-encoded entry — Windows Vista+ understands
 * this and it keeps file size sane (the alternative, BMP/DIB encoding,
 * adds ~3x bloat for the 256x256 frame with no quality benefit at tray
 * rendering sizes).
 */
function pngsToIco(frames /* [{ size, buf }] */) {
  const count = frames.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = ICO
  header.writeUInt16LE(count, 4)

  const dir = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count
  frames.forEach((f, i) => {
    const o = i * 16
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, o + 0) // width  (0 = 256)
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, o + 1) // height (0 = 256)
    dir.writeUInt8(0, o + 2) // palette
    dir.writeUInt8(0, o + 3) // reserved
    dir.writeUInt16LE(1, o + 4)  // color planes
    dir.writeUInt16LE(32, o + 6) // bpp
    dir.writeUInt32LE(f.buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += f.buf.length
  })
  return Buffer.concat([header, dir, ...frames.map((f) => f.buf)])
}

/** Read SVG, render every requested size, return [{size, buf}]. */
function renderFrames(svgPath, sizes) {
  const svg = readFileSync(svgPath)
  return sizes.map((size) => ({ size, buf: svgToPng(svg, size) }))
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true })
}

function writeFile(filePath, buf) {
  ensureDir(filePath)
  writeFileSync(filePath, buf)
  console.log(`  -> ${filePath} (${buf.length.toLocaleString()} bytes)`)
}

const ICO_SIZES = [16, 24, 32, 48, 64, 256]

const sources = [
  {
    name: 'icon (app / installer / taskbar)',
    svg: resolve(designRoot, 'icon.svg'),
    outputs: [
      { kind: 'ico', file: 'build/icon.ico' },
      { kind: 'ico', file: 'resources/icon.ico' },
      { kind: 'png', file: 'build/icon.png', size: 512 },
      { kind: 'png', file: 'resources/icon.png', size: 512 }
    ]
  },
  {
    name: 'icon_on (tray ON)',
    svg: resolve(designRoot, 'icon_on.svg'),
    outputs: [
      { kind: 'ico', file: 'resources/icon_on.ico' },
      { kind: 'png', file: 'resources/icon_on.png', size: 512 }
    ]
  },
  {
    name: 'icon_off (tray OFF)',
    svg: resolve(designRoot, 'icon_off.svg'),
    outputs: [
      { kind: 'ico', file: 'resources/icon_off.ico' },
      { kind: 'png', file: 'resources/icon_off.png', size: 512 }
    ]
  },
  {
    name: 'logo (sidebar — dark theme)',
    svg: resolve(designRoot, 'icon.svg'),
    outputs: [{ kind: 'png', file: 'src/renderer/src/assets/logo.png', size: 256 }]
  },
  {
    name: 'logo_white (sidebar — light theme)',
    svg: resolve(designRoot, 'icon_whitesidebar.svg'),
    outputs: [{ kind: 'png', file: 'src/renderer/src/assets/logo_white.png', size: 256 }]
  }
]

for (const src of sources) {
  console.log(`\n[${src.name}] from ${src.svg}`)
  // Render every size we'll need across this source's outputs once and reuse.
  const sizesNeeded = new Set()
  for (const out of src.outputs) {
    if (out.kind === 'ico') ICO_SIZES.forEach((s) => sizesNeeded.add(s))
    else sizesNeeded.add(out.size)
  }
  const frames = renderFrames(src.svg, [...sizesNeeded].sort((a, b) => a - b))
  const byteSize = (s) => frames.find((f) => f.size === s).buf

  for (const out of src.outputs) {
    const abs = resolve(projectRoot, out.file)
    if (out.kind === 'ico') {
      const icoFrames = ICO_SIZES.map((s) => ({ size: s, buf: byteSize(s) }))
      writeFile(abs, pngsToIco(icoFrames))
    } else {
      writeFile(abs, byteSize(out.size))
    }
  }
}

console.log('\nAll icons rebuilt successfully.')
