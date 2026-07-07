import { defineConfig, devices } from '@playwright/test'

// E2E contra la app real (Vite dev server + Supabase del entorno).
// Credenciales del usuario de pruebas vía variables de entorno:
//   HELPME_E2E_EMAIL / HELPME_E2E_PASSWORD
// Los tests que las necesitan se saltan solos si no están definidas.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-ES',
    // León (la zona del usuario de pruebas): así la geolocalización del
    // navegador es determinista y el mapa centra siempre igual.
    geolocation: { latitude: 42.5987, longitude: -5.5671 },
    permissions: ['geolocation'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
