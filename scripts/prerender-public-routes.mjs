import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const distDir = path.resolve('dist')
const siteUrl = String(process.env.VITE_PUBLIC_SITE_URL || 'https://invitasr.com').replace(/\/+$/, '')
const appName = process.env.VITE_APP_NAME || 'InvitaSR'

const routes = [
  {
    path: '/',
    file: 'index.html',
    title: `${appName} - Invitaciones digitales personalizables`,
    description: 'Crea invitaciones digitales elegantes, personalizables y listas para compartir. Prueba plantillas, confirma invitados y gestiona tu evento desde InvitaSR.',
    heading: 'Invitaciones digitales que enamoran desde el primer clic',
  },
  {
    path: '/demo',
    file: 'demo/index.html',
    title: `${appName} - Demo interactiva`,
    description: 'Explora plantillas reales por tipo de evento, filtra por plan y descubre como se crea una invitacion digital en InvitaSR antes de comprar.',
    heading: 'Demo interactiva de plantillas para invitaciones digitales',
  },
  {
    path: '/planes',
    file: 'planes/index.html',
    title: `${appName} - Planes`,
    description: 'Compara los planes de InvitaSR y elige la opcion ideal para crear, publicar y compartir tu invitacion digital.',
    heading: 'Planes para crear tu invitacion digital',
  },
  {
    path: '/noticias',
    file: 'noticias/index.html',
    title: `${appName} - Noticias`,
    description: 'Ideas, consejos y tendencias para crear invitaciones digitales memorables y mejorar la experiencia de tus invitados.',
    heading: 'Ideas para crear invitaciones digitales memorables',
  },
]

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const stripExistingMeta = (html) => html
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .replace(/\s*<meta\s+name="description"[^>]*>/i, '')
  .replace(/\s*<meta\s+property="og:[^"]+"[^>]*>/gi, '')
  .replace(/\s*<meta\s+name="twitter:[^"]+"[^>]*>/gi, '')
  .replace(/\s*<link\s+rel="canonical"[^>]*>/i, '')
  .replace(/\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '')

const buildRouteHtml = (template, route) => {
  const canonical = `${siteUrl}${route.path === '/' ? '' : route.path}`
  const safeTitle = escapeHtml(route.title)
  const safeDescription = escapeHtml(route.description)
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: appName,
      url: siteUrl,
    },
  })

  const headTags = [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDescription}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(appName)}">`,
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${safeDescription}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${safeTitle}">`,
    `<meta name="twitter:description" content="${safeDescription}">`,
    `<script type="application/ld+json">${structuredData}</script>`,
  ].join('\n    ')

  const fallbackContent = [
    '<noscript>',
    `<section style="max-width: 920px; margin: 80px auto; padding: 24px; font-family: sans-serif; color: #241337;">`,
    `<p style="text-transform: uppercase; letter-spacing: .12em; color: #7a4fd9; font-weight: 700;">${escapeHtml(appName)}</p>`,
    `<h1>${escapeHtml(route.heading)}</h1>`,
    `<p>${safeDescription}</p>`,
    '</section>',
    '</noscript>',
  ].join('')

  return stripExistingMeta(template)
    .replace('<head>', `<head>\n    ${headTags}`)
    .replace('<div id="app"></div>', `<div id="app">${fallbackContent}</div>`)
}

const buildSitemap = () => {
  const urls = routes.map((route) => {
    const loc = `${siteUrl}${route.path === '/' ? '' : route.path}`
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.8</priority>',
      '  </url>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

const buildRobots = () => [
  'User-agent: *',
  'Allow: /',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  '',
].join('\n')

const template = await readFile(path.join(distDir, 'index.html'), 'utf8')

for (const route of routes) {
  const target = path.join(distDir, route.file)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, buildRouteHtml(template, route))
}

await writeFile(path.join(distDir, 'sitemap.xml'), buildSitemap())
await writeFile(path.join(distDir, 'robots.txt'), buildRobots())
