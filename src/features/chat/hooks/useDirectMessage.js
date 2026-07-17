import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { canStartDirectConversation, createOrGetDirectConversation } from '../api/chatApi'

const IDLE = { helperId: null, status: 'idle', error: '' }

// Estado y apertura del chat directo con un helper. Encapsula el gate del
// servidor (preferencia accepts_direct_messages + bloqueos, validado por RLS)
// y la navegación a /messages, para que el perfil público y las superficies
// de descubrimiento de Home compartan exactamente la misma lógica.
//
// status: 'idle' (gate pendiente) | 'available' | 'unavailable' | 'error' | 'opening'
// - 'unavailable' = el helper rechaza mensajes (gate respondió false): CTA
//   oculto y el consumidor puede mostrar una pista discreta.
// - 'error' = el gate falló (sin sesión, RPC no desplegada...): CTA oculto
//   SIN pista, para no atribuir al helper un rechazo que no ha expresado.
export function useDirectMessage(helperId, { enabled = true } = {}) {
  const navigate = useNavigate()
  const [state, setState] = useState(IDLE)

  useEffect(() => {
    if (!helperId || !enabled) return undefined

    // Sin setState síncrono aquí (regla del compilador de React): mientras el
    // gate no responde para ESTE helper, `current` cae en IDLE, que ya actúa
    // como estado de carga (CTA oculto, sin pista).
    let cancelled = false

    canStartDirectConversation(helperId)
      .then((available) => {
        if (!cancelled) {
          setState({ helperId, status: available ? 'available' : 'unavailable', error: '' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ helperId, status: 'error', error: '' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [helperId, enabled])

  // El estado guardado puede pertenecer a un helper anterior (modal que cambia
  // de helper): en ese caso se responde 'idle' hasta que el efecto lo refresque.
  const current = state.helperId === helperId ? state : IDLE

  const openDirectMessage = useCallback(async () => {
    if (!helperId || current.status === 'opening') return

    setState({ helperId, status: 'opening', error: '' })

    try {
      const conversationId = await createOrGetDirectConversation(helperId)
      navigate('/messages', { state: { conversationId } })
    } catch {
      setState({
        helperId,
        status: 'unavailable',
        error: 'No se puede iniciar una conversación directa con este helper ahora.',
      })
    }
  }, [helperId, current.status, navigate])

  return {
    status: current.status,
    canMessage: current.status === 'available' || current.status === 'opening',
    isOpening: current.status === 'opening',
    rejectsMessages: current.status === 'unavailable',
    error: current.error,
    openDirectMessage,
  }
}
