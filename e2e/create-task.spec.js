import { expect, test } from '@playwright/test'

// Happy path completo de /create (hallazgos de QA):
// rellenar el formulario, elegir punto en el mapa, publicar y ver confirmación.
// Requiere un usuario de pruebas real: HELPME_E2E_EMAIL / HELPME_E2E_PASSWORD.
const email = process.env.HELPME_E2E_EMAIL || ''
const password = process.env.HELPME_E2E_PASSWORD || ''
const hasCredentials = Boolean(email && password)

async function login(page) {
  await page.goto('/login')

  // El banner de cookies bloquea clics si no se responde.
  const acceptCookies = page.getByRole('button', { name: /aceptar todo/i })
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click()
  }

  await page.getByPlaceholder('tu@email.com').fill(email)
  await page.getByPlaceholder('Tu contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30_000 })
}

test.describe('/create — publicar solicitud', () => {
  test.skip(!hasCredentials, 'Define HELPME_E2E_EMAIL y HELPME_E2E_PASSWORD para correr este test.')

  test('happy path: rellenar, elegir ubicación, publicar y ver confirmación', async ({ page }) => {
    await login(page)
    await page.goto('/create')

    // Título de página claro (regresión QA: antes decía "Guardar ayuda").
    await expect(page.getByRole('heading', { name: 'Nueva solicitud' })).toBeVisible()

    // Sin ubicación: hint visible y botón bloqueado (regresión QA: bloqueo mudo).
    const submit = page.getByRole('button', { name: 'Publicar solicitud' })
    await expect(page.getByText('Selecciona un punto en el mapa para continuar.')).toBeVisible()
    await expect(submit).toBeDisabled()

    // Labels con tildes (regresión QA).
    await expect(page.getByText('Título', { exact: true })).toBeVisible()
    await expect(page.getByText('Descripción', { exact: true })).toBeVisible()
    await expect(page.getByText('Categoría', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ayuda técnica' })).toBeVisible()

    const stamp = Date.now()
    await page.getByPlaceholder('Sacar al perro 30 min').fill(`[E2E] Pasear al perro ${stamp}`)
    await page
      .getByPlaceholder('Cuenta brevemente lo que necesitas.')
      .fill('Prueba automatizada: paseo corto de 30 minutos por el barrio.')
    await page.getByRole('button', { name: 'Mascotas' }).click()

    // Elegir punto en el mapa: abre el selector y clica en el centro del mapa.
    await page.getByRole('button', { name: /elegir punto en mapa/i }).click()
    const map = page.locator('.leaflet-container').first()
    await expect(map).toBeVisible()
    await map.click({ position: { x: 320, y: 200 } })
    const saveLocation = page.getByRole('button', { name: 'Guardar ubicación' })
    await expect(saveLocation).toBeEnabled()
    await saveLocation.click()

    // Con la ubicación elegida, el hint desaparece y el botón se habilita.
    await expect(page.getByText('Selecciona un punto en el mapa para continuar.')).toBeHidden()
    await expect(submit).toBeEnabled()

    await submit.click()

    // Confirmación visible (regresión QA: antes solo había un redirect mudo)...
    await expect(page.getByText('Solicitud publicada')).toBeVisible({ timeout: 20_000 })

    // ...y aterrizamos en /home.
    await page.waitForURL(/\/home/, { timeout: 15_000 })
  })

  test('validación en español: el precio negativo se rechaza con mensaje propio', async ({ page }) => {
    await login(page)
    await page.goto('/create')

    await page.getByPlaceholder('Sacar al perro 30 min').fill('[E2E] Validación de precio')
    await page.getByPlaceholder('Cuenta brevemente lo que necesitas.').fill('Prueba de validación.')
    await page.getByLabel('Precio personalizado').fill('-5')

    // Elegir ubicación para que el envío llegue a la validación de precio.
    await page.getByRole('button', { name: /elegir punto en mapa/i }).click()
    const map = page.locator('.leaflet-container').first()
    await expect(map).toBeVisible()
    await map.click({ position: { x: 320, y: 200 } })
    await page.getByRole('button', { name: 'Guardar ubicación' }).click()

    await page.getByRole('button', { name: 'Publicar solicitud' }).click()

    // Mensaje en español, no el nativo del navegador en inglés (regresión QA).
    await expect(page.getByText('El precio no puede ser negativo.')).toBeVisible()
  })
})
