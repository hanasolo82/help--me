import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const root = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me'
const faviconSvg = readFileSync(`${root}/public/favicon.svg`, 'utf-8')
const browser = await chromium.launch({ channel: 'chrome' })

// 1) Preview del favicon a 16/32/64 px en claro y oscuro (fondo simulado de pestaña).
async function previewFavicon(scheme, tabBg) {
  const page = await browser.newPage({ colorScheme: scheme })
  await page.setContent(`<!doctype html><body style="margin:0;background:${tabBg};display:flex;gap:24px;align-items:center;padding:24px">
    <div style="width:16px;height:16px">${faviconSvg}</div>
    <div style="width:32px;height:32px">${faviconSvg}</div>
    <div style="width:64px;height:64px">${faviconSvg}</div>
  </body>`)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${root}/tmp/favicon-preview-${scheme}.png` })
  await page.close()
}
await previewFavicon('light', '#ffffff')
await previewFavicon('dark', '#1f2430')

// 2) apple-touch-icon.png: 180x180, tile verde de marca con la M en crema.
// iOS ignora prefers-color-scheme y pone la transparencia en negro -> fondo sólido.
const mMatch = faviconSvg.match(/<path fill-rule="evenodd" d="([^"]*)"/)
const mPath = mMatch[1]
const tile = (size, bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="319 11 184 184">
  <rect x="319" y="11" width="184" height="184" fill="${bg}"/>
  <path fill-rule="evenodd" fill="${fg}" d="${mPath}"/>
</svg>`

async function raster(svg, size, out) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`)
  await page.waitForTimeout(120)
  const el = await page.$('svg')
  await el.screenshot({ path: out, omitBackground: false })
  await page.close()
}
// Tile verde de marca (#1f6b48) con M crema (#f8f6f1) para iOS.
await raster(tile(180, '#1f6b48', '#f8f6f1'), 180, `${root}/public/apple-touch-icon.png`)
// Fallback PNG 32x32 para navegadores sin favicon SVG: M oscura sobre transparente.
await raster(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="319 11 184 184"><path fill-rule="evenodd" fill="#101010" d="${mPath}"/></svg>`,
  32,
  `${root}/public/favicon-32.png`,
)
await browser.close()
console.log('Iconos generados')
