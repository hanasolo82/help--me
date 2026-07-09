import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:5173/request-modal-lab', { waitUntil: 'networkidle' })
await page.waitForSelector('[role="dialog"]')
const input = page.locator('#request-title-input')
await input.click()
// Teclea carácter a carácter; si el efecto del Modal robara el foco, se perdería.
await page.keyboard.type('Necesito ayuda con la compra', { delay: 25 })
const value = await input.inputValue()
const focusOk = await page.evaluate(() => document.activeElement?.id === 'request-title-input')
console.log('valor:', JSON.stringify(value))
console.log('foco sigue en el input:', focusOk)
await browser.close()
