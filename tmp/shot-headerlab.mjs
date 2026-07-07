import { chromium } from '@playwright/test'

const outDir = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp'
const widths = [760, 980, 1200, 1440]

const browser = await chromium.launch({ channel: 'chrome' })
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 760 } })
  await page.goto('http://localhost:5173/header-lab', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}/headerlab-fix-${width}.png` })
  // Medidas reales de los botones circulares en ambos headers
  const sizes = await page.$$eval('header button', (buttons) =>
    buttons.map((b) => {
      const r = b.getBoundingClientRect()
      return `${b.getAttribute('aria-label') || b.className.split(' ')[0].slice(0, 24) || 'btn'}: ${Math.round(r.width)}x${Math.round(r.height)}`
    }),
  )
  console.log(`--- ${width}px ---`)
  console.log(sizes.join('\n'))
  await page.close()
}
await browser.close()
