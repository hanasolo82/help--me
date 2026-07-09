import { useState } from 'react'
import RequestTaskModal from '../../features/home/need-help/components/RequestTaskModal'

// Lab dev-only: monta el RequestTaskModal real para verificar los flujos de
// cierre (backdrop, X, Escape, confirmación de descarte) sin necesitar sesión.
// No existe en producción.
export default function RequestModalLab() {
  const [open, setOpen] = useState(true)
  const [log, setLog] = useState('modal abierto')

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', gap: '1rem' }}>
      <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'center' }}>
        <button type="button" className="primary-action" onClick={() => { setOpen(true); setLog('modal abierto') }}>
          Abrir modal
        </button>
        <p className="muted" data-testid="lab-log">Estado: {log}</p>
      </div>

      <RequestTaskModal
        open={open}
        location={{ lat: 42.5987, lng: -5.5671, label: 'León Centro' }}
        locationStatus="ready"
        onClose={() => { setOpen(false); setLog('cerrado (onClose)') }}
        onSaved={() => setLog('guardado')}
      />
    </main>
  )
}
