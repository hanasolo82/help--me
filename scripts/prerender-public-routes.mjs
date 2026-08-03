import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = path.join(PROJECT_ROOT, 'dist')
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html')
const SITE_ORIGIN = 'https://helpme-community.com'

const PUBLIC_ROUTES = [
  {
    pathname: '/',
    outputPath: 'index.html',
    title: 'HelpMe',
    socialTitle: 'HelpMe · Ayuda local entre vecinos',
    description:
      'HelpMe conecta a personas que necesitan resolver tareas cotidianas con vecinos cercanos que pueden ayudarlas.',
    requiredMarkupFragments: [
      'HelpMe, ayuda cercana para tus tareas cotidianas',
      'Inicio de sesión con Google',
      'HelpMe recibe tu nombre, correo electrónico y foto de perfil',
    ],
  },
  {
    pathname: '/legal/privacy',
    outputPath: 'legal/privacy/index.html',
    title: 'Política de privacidad · HelpMe',
    socialTitle: 'Política de privacidad · HelpMe',
    description:
      'Política de privacidad de HelpMe: datos tratados, uso del inicio de sesión con Google, proveedores y derechos de las personas usuarias.',
    requiredMarkupFragments: ['Google Ireland Limited', 'Recibimos email, nombre y avatar publico'],
  },
  {
    pathname: '/legal/terms',
    outputPath: 'legal/terms/index.html',
    title: 'Términos y condiciones · HelpMe',
    socialTitle: 'Términos y condiciones · HelpMe',
    description:
      'Términos y condiciones de HelpMe para solicitar y prestar ayuda con tareas cotidianas entre personas cercanas.',
  },
]

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Could not update ${label} in dist/index.html`)
  }

  return source.replace(pattern, replacement)
}

function setMetaTag(html, attribute, name, content) {
  const pattern = new RegExp(
    `<meta\\s+${attribute}="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`,
    'i',
  )
  const tag = `<meta ${attribute}="${name}" content="${escapeAttribute(content)}" />`
  return replaceRequired(html, pattern, tag, `${attribute}="${name}"`)
}

function buildDocument(template, route, renderedMarkup) {
  const canonicalUrl = `${SITE_ORIGIN}${route.pathname === '/' ? '/' : route.pathname}`
  let html = replaceRequired(
    template,
    /<div id="root"><\/div>/,
    `<div id="root">${renderedMarkup}</div>`,
    'prerender root',
  )

  html = replaceRequired(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttribute(route.title)}</title>`,
    'title',
  )
  html = replaceRequired(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    'canonical URL',
  )
  html = setMetaTag(html, 'name', 'description', route.description)
  html = setMetaTag(html, 'property', 'og:title', route.socialTitle)
  html = setMetaTag(html, 'property', 'og:description', route.description)
  html = setMetaTag(html, 'property', 'og:url', canonicalUrl)
  html = setMetaTag(html, 'name', 'twitter:title', route.socialTitle)
  html = setMetaTag(html, 'name', 'twitter:description', route.description)

  return html
}

function assertPrerenderedDocument(html, renderedMarkup, route) {
  const requiredFragments = ['<div id="root">', route.description]

  for (const fragment of requiredFragments) {
    if (!html.includes(fragment)) {
      throw new Error(`Prerender output for ${route.pathname} is missing: ${fragment}`)
    }
  }

  if (html.includes('<div id="root"></div>')) {
    throw new Error(`Prerender output for ${route.pathname} still has an empty root`)
  }

  const requiredMarkupFragments = ['<h1', 'HelpMe', ...(route.requiredMarkupFragments ?? [])]

  for (const fragment of requiredMarkupFragments) {
    if (!renderedMarkup.includes(fragment)) {
      throw new Error(`Prerender markup for ${route.pathname} is missing: ${fragment}`)
    }
  }
}

const template = await readFile(TEMPLATE_PATH, 'utf8')
const vite = await createServer({
  configFile: path.join(PROJECT_ROOT, 'vite.config.js'),
  appType: 'custom',
  logLevel: 'error',
  server: {
    middlewareMode: true,
  },
})

try {
  const { renderPublicRoute } = await vite.ssrLoadModule('/src/prerender/renderPublicRoute.jsx')

  for (const route of PUBLIC_ROUTES) {
    const renderedMarkup = renderPublicRoute(route.pathname)
    const document = buildDocument(template, route, renderedMarkup)
    assertPrerenderedDocument(document, renderedMarkup, route)

    const outputPath = path.join(DIST_DIR, route.outputPath)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, document, 'utf8')
    console.log(`[prerender] ${route.pathname} -> dist/${route.outputPath}`)
  }
} finally {
  await vite.close()
}
