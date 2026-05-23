import express from 'express'
import cors from 'cors'
import stripeRoutes from './routes/stripe.routes.js'
import { loadServerEnv } from './config/env.js'

const { env, errors } = loadServerEnv()
const processRef = globalThis.process

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
    origin: env.CLIENT_URL,
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
  res.status(500).json({
    error: 'Internal server error.',
  })
})

app.listen(env.PORT, () => {
  console.log(`[server] Private Stripe server listening on http://localhost:${env.PORT}`)
  console.log(`[server] Client origin: ${env.CLIENT_URL}`)
})
