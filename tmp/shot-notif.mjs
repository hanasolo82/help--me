import { chromium } from '@playwright/test'

const out = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp'
const base = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome' })

// Desktop claro: mide el hueco real entre el subtítulo del header y la 1ª fila.
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(`${base}/notifications-lab`, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/notif-desktop.png` })

const metrics = await page.evaluate(() => {
  const main = document.querySelector('main')
  const header = main.querySelector('.page-header')
  const feed = main.querySelector('ul') || main.querySelector('section')
  const mainRect = main.getBoundingClientRect()
  const headerRect = header.getBoundingClientRect()
  const feedRect = feed.getBoundingClientRect()
  return {
    mainWidth: Math.round(mainRect.width),
    gapHeaderToFeed: Math.round(feedRect.top - headerRect.bottom),
  }
})
console.log('Desktop:', JSON.stringify(metrics))
await page.close()

// Dark
const dark = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await dark.addInitScript(() => window.localStorage.setItem('helpme-theme-preference', 'dark'))
await dark.goto(`${base}/notifications-lab`, { waitUntil: 'networkidle' })
await dark.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
await dark.waitForTimeout(300)
await dark.screenshot({ path: `${out}/notif-dark.png` })
await dark.close()

// Móvil
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto(`${base}/notifications-lab`, { waitUntil: 'networkidle' })
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: `${out}/notif-mobile.png` })
await mobile.close()

await browser.close()
console.log('Listo')
