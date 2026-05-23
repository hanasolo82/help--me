import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = dirname(fileURLToPath(import.meta.url))
const nodeProcess = typeof globalThis.process !== 'undefined' ? globalThis.process : null

if (nodeProcess?.versions?.node) {
  dotenv.config({ path: resolve(serverDir, '..', '.env') })
}

function required(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function optionalUrl(value, fallback) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || fallback
}

export function loadServerEnv() {
  const errors = []

  const envSource = nodeProcess?.env || {}
  const port = Number.parseInt(envSource.PORT ?? '3001', 10)
  const env = {
    PORT: Number.isFinite(port) ? port : 3001,
    APP_URL: optionalUrl(envSource.APP_URL, 'http://localhost:5173'),
    CLIENT_URL: optionalUrl(envSource.CLIENT_URL, 'http://localhost:5173'),
    STRIPE_SECRET_KEY: envSource.STRIPE_SECRET_KEY?.trim() || '',
    STRIPE_WEBHOOK_SECRET: envSource.STRIPE_WEBHOOK_SECRET?.trim() || '',
    SUPABASE_URL: envSource.SUPABASE_URL?.trim() || '',
    SUPABASE_SERVICE_ROLE_KEY: envSource.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
    SUPABASE_ANON_KEY: envSource.SUPABASE_ANON_KEY?.trim() || '',
  }

  if (!Number.isFinite(port) || port <= 0) {
    errors.push('PORT debe ser un numero valido. Revisa server/.env.')
  }

  if (!required(env.STRIPE_SECRET_KEY)) {
    errors.push('Falta STRIPE_SECRET_KEY en server/.env.')
  }

  if (!required(env.STRIPE_WEBHOOK_SECRET)) {
    errors.push('Falta STRIPE_WEBHOOK_SECRET en server/.env.')
  }

  if (!required(env.SUPABASE_URL)) {
    errors.push('Falta SUPABASE_URL en server/.env.')
  }

  if (!required(env.SUPABASE_SERVICE_ROLE_KEY)) {
    errors.push('Falta SUPABASE_SERVICE_ROLE_KEY en server/.env.')
  }

  if (!required(env.SUPABASE_ANON_KEY)) {
    errors.push('Falta SUPABASE_ANON_KEY en server/.env.')
  }

  return { env, errors }
}
