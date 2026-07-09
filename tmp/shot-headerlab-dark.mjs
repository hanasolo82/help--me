import { chromium } from '@playwright/test'
const out = 'C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 520 } })
await page.addInitScript(() => window.localStorage.setItem('helpme-theme-preference', 'dark'))
await page.goto('http://localhost:5173/header-lab', { waitUntil: 'networkidle' })
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/headerlab-dark.png` })
await browser.close()
console.log('done')
