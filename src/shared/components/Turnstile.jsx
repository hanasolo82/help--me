import { useEffect, useRef } from 'react'

// Carga el script de Cloudflare Turnstile una sola vez y expone el widget como componente React.
// La secret key vive en Supabase (Auth > CAPTCHA protection) — aqui solo la site-key publica.

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const readyCallbacks = []

function isReady() {
  return typeof window !== 'undefined' && typeof window.turnstile !== 'undefined'
}

function ensureScript() {
  if (typeof document === 'undefined') return
  if (isReady()) return
  if (document.getElementById(SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = SCRIPT_SRC
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

function whenReady(cb) {
  if (isReady()) {
    cb()
    return
  }
  readyCallbacks.push(cb)
  const interval = window.setInterval(() => {
    if (isReady()) {
      window.clearInterval(interval)
      while (readyCallbacks.length) {
        readyCallbacks.shift()()
      }
    }
  }, 100)
}

export default function Turnstile({ siteKey, onVerify, onExpire, action, theme = 'auto' }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onVerifyRef.current = onVerify
    onExpireRef.current = onExpire
  }, [onVerify, onExpire])

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    ensureScript()
    let cancelled = false
    const node = containerRef.current

    whenReady(() => {
      if (cancelled || !node) return
      widgetIdRef.current = window.turnstile.render(node, {
        sitekey: siteKey,
        action,
        theme,
        callback: (token) => onVerifyRef.current?.(token),
        'expired-callback': () => {
          onVerifyRef.current?.('')
          onExpireRef.current?.()
        },
        'error-callback': () => {
          onVerifyRef.current?.('')
        },
      })
    })

    return () => {
      cancelled = true
      if (widgetIdRef.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // El widget puede haber sido removido por re-render previo.
        }
      }
    }
  }, [siteKey, action, theme])

  if (!siteKey) return null

  return <div ref={containerRef} className="turnstile-widget" />
}
