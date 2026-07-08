import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const svg = readFileSync('C:/Users/User/00-PROGRAMACION/01-FULLSTACK-ENGINER/PROYECTOS-WEB/help-me/tmp/m-solid.svg', 'utf-8')
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`)
const box = await page.evaluate(() => {
  const g = document.getElementById('m')
  const b = g.getBBox()
  return { x: b.x, y: b.y, w: b.width, h: b.height }
})
console.log(JSON.stringify(box))
await browser.close()
