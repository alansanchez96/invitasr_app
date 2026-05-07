import { readdir, rename } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const rootDir = process.cwd()

const optimizeHeroImages = async () => {
  const heroDir = path.join(rootDir, 'src/assets/img/hero')
  const files = (await readdir(heroDir)).filter((file) => file.endsWith('.webp'))

  await Promise.all(files.map(async (file) => {
    const target = path.join(heroDir, file)
    const buffer = await sharp(target)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 74, effort: 6 })
      .toBuffer()

    await sharp(buffer).toFile(target)
  }))
}

const optimizeBrandImages = async () => {
  const brandDir = path.join(rootDir, 'public/brand')

  const iconTemp = path.join(brandDir, 'logo_icon.optimized.png')
  const logoTemp = path.join(brandDir, 'logo-transparent.optimized.png')

  await sharp(path.join(brandDir, 'logo_icon.png'))
    .rotate()
    .resize({ width: 256, height: 256, fit: 'contain', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toFile(iconTemp)

  await sharp(path.join(brandDir, 'logo-transparent.png'))
    .rotate()
    .resize({ width: 620, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toFile(logoTemp)

  await rename(iconTemp, path.join(brandDir, 'logo_icon.png'))
  await rename(logoTemp, path.join(brandDir, 'logo-transparent.png'))
}

await optimizeHeroImages()
await optimizeBrandImages()
