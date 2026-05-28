import { useState } from 'react'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

const DURATION_OPTIONS = [
  { value: 'now', label: 'Solo ahora' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'manual', label: 'Hasta desactivarlo' },
]

function isHelperCompleted(profile) {
  return profile?.helper_status === 'active'
}

export default function ActivityZoneSettings() {
  const { profile } = useSettings()
  const helperCompleted = isHelperCompleted(profile)
  const [draft, setDraft] = useState({
    activeZone: '',
    duration: 'now',
    syncCurrentLocation: false,
    receiveRequestsInActiveZone: false,
    appliedZone: '',
  })

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <SettingsCard
      id="actividad-zona"
      eyebrow="Actividad"
      title="Actividad y zona"
      description="Define una zona temporal sin cambiar tu configuración principal."
    >
      <div className={styles.localDraftPanel}>
        <p className={styles.localDraftNotice}>
          <strong>Configuración local.</strong> Se aplicará cuando activemos zona temporal.
        </p>

        <div className={styles.settingsStack}>
        <label className={styles.field}>
          <span>Zona activa</span>
          <input
            value={draft.activeZone}
            onChange={(event) => updateDraft('activeZone', event.target.value)}
            placeholder="Madrid centro"
          />
        </label>

        <div className={styles.zoneActionRow}>
          <button
            type="button"
            className="secondary-action"
            onClick={() => updateDraft('appliedZone', draft.activeZone.trim() || 'Zona temporal')}
          >
            Cambiar zona temporalmente
          </button>
          {draft.appliedZone ? <p>Zona temporal seleccionada: {draft.appliedZone}</p> : null}
        </div>

        <div className={styles.field}>
          <span>Duración</span>
          <div className={styles.segmentedControlWide} role="radiogroup" aria-label="Duración de zona temporal">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={draft.duration === option.value ? styles.segmentedActive : styles.segmentedButton}
                onClick={() => updateDraft('duration', option.value)}
                aria-pressed={draft.duration === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.settingToggleRow}>
          <div>
            <strong>Sincronizar con mi ubicación actual</strong>
            <p>Usar mi posición actual para actualizar la zona activa.</p>
          </div>
          <button
            type="button"
            className={draft.syncCurrentLocation ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={() => updateDraft('syncCurrentLocation', !draft.syncCurrentLocation)}
            aria-pressed={draft.syncCurrentLocation}
          >
            {draft.syncCurrentLocation ? 'Sí' : 'No'}
          </button>
        </div>

        {helperCompleted ? (
          <div className={styles.settingToggleRow}>
            <div>
              <strong>Recibir solicitudes en esta zona</strong>
              <p>Usar esta zona temporal para solicitudes de ayudante.</p>
            </div>
            <button
              type="button"
              className={draft.receiveRequestsInActiveZone ? `${styles.switch} ${styles.switchOn}` : styles.switch}
              onClick={() => updateDraft('receiveRequestsInActiveZone', !draft.receiveRequestsInActiveZone)}
              aria-pressed={draft.receiveRequestsInActiveZone}
            >
              {draft.receiveRequestsInActiveZone ? 'Sí' : 'No'}
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </SettingsCard>
  )
}
