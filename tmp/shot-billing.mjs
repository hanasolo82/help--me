import { chromium } from '@playwright/test'

const out = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp'
const base = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome' })

async function shot(page, name) {
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/billing-${name}.png`, fullPage: true })
}

// Desktop claro: flujo completo
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(`${base}/facturacion`, { waitUntil: 'networkidle' })
await shot(page, 'facturacion')

await page.getByRole('button', { name: 'Cambiar de plan' }).click()
await page.waitForURL('**/planes')
await shot(page, 'planes-mensual')

await page.getByRole('radio', { name: /Anual/ }).click()
await shot(page, 'planes-anual')

await page.getByRole('article', { name: 'Plan Vecino Plus' }).getByRole('link', { name: 'Elegir plan' }).click()
await page.waitForURL('**/pago?plan=plus&ciclo=anual')
await shot(page, 'pago-plus-anual')

await page.getByRole('button', { name: 'Confirmar suscripción' }).click()
await shot(page, 'pago-exito')
await page.waitForURL('**/facturacion', { timeout: 5000 })
console.log('Flujo completo OK: /facturacion -> /planes -> /pago -> /facturacion')

// Diálogo de cancelación
await page.getByRole('button', { name: 'Cancelar plan' }).first().click()
await shot(page, 'cancelar-modal')
await page.getByRole('button', { name: 'Cancelar plan' }).last().click()
await shot(page, 'cancelar-feedback')
await page.close()

// Modo oscuro (data-theme en <html>, como hace ThemeApplier)
const dark = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
await dark.goto(`${base}/planes`, { waitUntil: 'networkidle' })
await dark.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'dark')
})
await dark.waitForTimeout(400)
await shot(dark, 'planes-dark')
await dark.goto(`${base}/pago?plan=pro&ciclo=mensual`, { waitUntil: 'networkidle' })
await dark.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
await shot(dark, 'pago-dark')
await dark.close()

// Móvil
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto(`${base}/planes`, { waitUntil: 'networkidle' })
await shot(mobile, 'planes-mobile')
await mobile.goto(`${base}/pago?plan=plus&ciclo=mensual`, { waitUntil: 'networkidle' })
await shot(mobile, 'pago-mobile')
await mobile.close()

await browser.close()
console.log('Screenshots listos')
