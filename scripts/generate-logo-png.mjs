// Regenerates public/logo-cantoni.png and lib/pdf/logo-data.ts from the source
// SVG. Run after changing public/logo-cantoni.svg:
//   node scripts/generate-logo-png.mjs
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('public/logo-cantoni.svg')
const png = await sharp(svg, { density: 300 }).resize({ width: 480 }).png().toBuffer()
writeFileSync('public/logo-cantoni.png', png)

const b64 = png.toString('base64')
const content =
  '// Auto-generated from public/logo-cantoni.png (sharp-rasterized from logo-cantoni.svg).\n' +
  '// Inlined so server-side PDF generation works on serverless where public/ is not on the lambda FS.\n' +
  '// To regenerate: node scripts/generate-logo-png.mjs\n' +
  `export const LOGO_PNG_DATA_URI = 'data:image/png;base64,${b64}'\n`
writeFileSync('lib/pdf/logo-data.ts', content)

console.log(`Wrote public/logo-cantoni.png (${png.length} bytes) and lib/pdf/logo-data.ts`)
