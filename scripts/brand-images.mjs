// Builds the favicons and the link preview image (public/) from assets/logo.png.
// Run with: node scripts/brand-images.mjs
import sharp from 'sharp'

const LOGO = 'assets/logo.png'
const BACKGROUND = 'assets/hero-bg-dark.webp'
const NAVY = '#070B30'

async function icon(size, file, padding) {
  const logo = await sharp(LOGO)
    .resize({ width: Math.round(size * (1 - 2 * padding)) })
    .toBuffer()
  const radius = Math.round(size * 0.18)
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/></svg>`,
  )
  await sharp(mask).composite([{ input: logo, gravity: 'center' }]).png().toFile(file)
}

async function preview() {
  const [width, height] = [1200, 630]
  const backdrop = await sharp(BACKGROUND)
    .resize(width, height, { fit: 'cover' })
    .modulate({ brightness: 0.55 })
    .blur(3)
    .toBuffer()
  const logo = await sharp(LOGO).resize({ width: 820 }).toBuffer()
  await sharp(backdrop)
    .composite([{ input: logo, gravity: 'center' }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile('public/og-image.jpg')
}

await icon(48, 'public/favicon-48.png', 0.04)
await icon(192, 'public/icon-192.png', 0.08)
await icon(180, 'public/apple-touch-icon.png', 0.08)
await preview()
console.log('done')
