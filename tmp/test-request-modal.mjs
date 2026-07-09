import { chromium } from '@playwright/test'

const out = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp'
const base = 'http://localhost:5173/request-modal-lab'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const log = (m) => console.log(m)
const state = () => page.getByTestId('lab-log').innerText()

await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForSelector('[role="dialog"]')

// 1) Click fuera (backdrop) sin cambios -> NO cierra.
await page.mouse.click(20, 20)
await page.waitForTimeout(200)
log('1) backdrop sin cambios -> dialog visible: ' + (await page.locator('[role="dialog"]').isVisible()) + ' | ' + (await state()))

// 2) X sin cambios -> cierra directamente.
await page.getByRole('button', { name: 'Cerrar publicación de solicitud' }).click()
await page.waitForTimeout(300)
log('2) X sin cambios -> dialog count: ' + (await page.locator('[role="dialog"]').count()) + ' | ' + (await state()))

// Reabrir
await page.getByRole('button', { name: 'Abrir modal' }).click()
await page.waitForSelector('[role="dialog"]')

// 3) Escribir algo -> X -> aparece confirmación.
await page.locator('#request-title-input').fill('Sacar al perro')
await page.getByRole('button', { name: 'Cerrar publicación de solicitud' }).click()
await page.waitForTimeout(250)
const confirmVisible = await page.getByText('¿Descartar solicitud?').isVisible()
const focusedText = await page.evaluate(() => document.activeElement?.textContent)
log('3) con cambios -> confirmación visible: ' + confirmVisible + ' | foco en: ' + JSON.stringify(focusedText))
await page.screenshot({ path: `${out}/reqmodal-confirm-light.png` })

// 4) Seguir editando -> vuelve al modal con datos intactos.
await page.getByRole('button', { name: 'Seguir editando' }).click()
await page.waitForTimeout(250)
const titleKept = await page.locator('#request-title-input').inputValue()
log('4) seguir editando -> título intacto: ' + JSON.stringify(titleKept) + ' | confirmación visible: ' + (await page.getByText('¿Descartar solicitud?').isVisible().catch(() => false)))

// 5) Escape con cambios -> confirmación otra vez.
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
log('5) Escape con cambios -> confirmación visible: ' + (await page.getByText('¿Descartar solicitud?').isVisible()))

// 6) Descartar -> cierra todo.
await page.getByRole('button', { name: 'Descartar' }).click()
await page.waitForTimeout(300)
log('6) descartar -> dialog count: ' + (await page.locator('[role="dialog"]').count()) + ' | ' + (await state()))

await page.close()

// Dark: captura de la confirmación en oscuro.
const dark = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await dark.addInitScript(() => window.localStorage.setItem('helpme-theme-preference', 'dark'))
await dark.goto(base, { waitUntil: 'networkidle' })
await dark.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
await dark.waitForSelector('[role="dialog"]')
await dark.screenshot({ path: `${out}/reqmodal-header-dark.png` })
await dark.locator('#request-title-input').fill('Compra semanal')
await dark.getByRole('button', { name: 'Cerrar publicación de solicitud' }).click()
await dark.waitForTimeout(250)
await dark.screenshot({ path: `${out}/reqmodal-confirm-dark.png` })
await dark.close()

// Mobile: header + X.
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mob.goto(base, { waitUntil: 'networkidle' })
await mob.waitForSelector('[role="dialog"]')
await mob.screenshot({ path: `${out}/reqmodal-mobile.png` })
await mob.close()

await browser.close()
console.log('DONE')
