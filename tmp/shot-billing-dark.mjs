import { chromium } from '@playwright/test'

const out = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp'
const base = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome' })

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
// El tema oscuro real se aplica vía ThemeApplier leyendo esta clave.
await page.addInitScript(() => {
  window.localStorage.setItem('helpme-theme-preference', 'dark')
})

for (const [route, name] of [
  ['/planes', 'planes-dark'],
  ['/pago?plan=pro&ciclo=mensual', 'pago-dark'],
  ['/facturacion', 'facturacion-dark'],
]) {
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/billing-${name}.png`, fullPage: true })
}

await browser.close()
console.log('Dark listo')
