import express from 'express'
import cors from 'cors'
import stripeRoutes from './routes/stripe.routes.js'
import { loadServerEnv } from './config/env.js'

const { env, errors } = loadServerEnv()
const processRef = globalThis.process
const allowedOrigins = new Set([env.CLIENT_URL, env.APP_URL].filter(Boolean))

if (errors.length > 0) {
  console.error('\n[server] No se pudo iniciar el servidor privado de Stripe.')
  console.error('[server] Revisa server/.env y corrige estos errores:')
  errors.forEach((error) => {
    console.error(`- ${error}`)
  })
  console.error('\n[server] Usa server/.env.example como referencia y vuelve a arrancar.\n')
  processRef.exit(1)
}

const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true)
      }

      const normalizedOrigin = origin.replace('127.0.0.1', 'localhost')

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  }),
)

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'helpme-api',
  })
})

app.use('/api/stripe', stripeRoutes)

app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found.',
  })
})

app.use((error, _req, res) => {
  console.error('[server] Unhandled error:', error)
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500
  const message = statusCode === 500 ? 'Internal server error.' : (error?.message || 'Request failed.')

  res.status(statusCode).json({
    error: message,
  })
})

app.listen(env.PORT, () => {
  console.log(`[server] Private Stripe server listening on http://localhost:${env.PORT}`)
  console.log(`[server] Client origin: ${env.CLIENT_URL}`)
})
