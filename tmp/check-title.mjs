import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
console.log('document.title =', JSON.stringify(await page.title()))
console.log('og:title      =', JSON.stringify(await page.getAttribute('meta[property="og:title"]', 'content')))
await browser.close()
