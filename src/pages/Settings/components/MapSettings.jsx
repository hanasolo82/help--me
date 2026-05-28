import { useEffect, useState } from 'react'
import { sanitizeText } from '../../../lib/security'
import { getLocationLabel } from '../../../features/profile/utils/profileFormatters'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function MapSettings() {
  const { form, profile } = useSettings()
  const [zoneEditing, setZoneEditing] = useState(false)
  const [zoneDraft, setZoneDraft] = useState(() => getLocationLabel(profile))
  const [radiusEnabled, setRadiusEnabled] = useState(() => Boolean(profile?.search_radius_km != null))

  useEffect(() => {
    if (!zoneEditing) {
      setZoneDraft(getLocationLabel(profile))
    }
  }, [profile, zoneEditing])

  return (
    <SettingsCard
      id="mapa-ubicacion"
      eyebrow="Mapa"
      title="Mapa y ubicación"
      description="Define tu zona visible y cómo se muestra tu ubicación."
    >
      <div className={styles.mapSettingsStack}>
        <div className={styles.mapZoneRow}>
          <div className={styles.mapZoneCopy}>
            <span>Zona en la que apareces visible</span>
            <strong>{zoneDraft || getLocationLabel(profile)}</strong>
          </div>

          <button
            type="button"
            className={`${styles.settingsCompactAction} ${styles.settingsCompactActionWide}`}
            onClick={() => setZoneEditing((current) => !current)}
          >
            Cambiar zona
          </button>
        </div>

        {zoneEditing ? (
          <input
            className={styles.mapZoneInput}
            value={zoneDraft}
            onChange={(event) => setZoneDraft(sanitizeText(event.target.value, 80))}
            placeholder="Madrid centro"
            aria-label="Zona visible"
          />
        ) : null}

        <div className={styles.mapSwitchRow}>
          <div className={styles.mapToggleCopy}>
            <strong>Usar radio de búsqueda</strong>
            <p>
              {radiusEnabled
                ? 'Limita los resultados a una distancia cercana desde tu posición.'
                : 'Se mostrarán resultados de toda el área visible del mapa.'}
            </p>
          </div>

          <button
            type="button"
            className={
              radiusEnabled
                ? `${styles.settingsSwitch} ${styles.settingsSwitchOn} ${styles.settingsSwitchInline}`
                : `${styles.settingsSwitch} ${styles.settingsSwitchInline}`
            }
            onClick={() => setRadiusEnabled((current) => !current)}
            role="switch"
            aria-checked={radiusEnabled}
            aria-label="Usar radio de búsqueda"
          >
            <span className={styles.settingsSwitchThumb} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.mapSwitchRow}>
          <div className={styles.mapToggleCopy}>
            <strong>Mostrar ubicación aproximada</strong>
            <p>Mostraremos solo tu zona general, no tu punto exacto.</p>
          </div>

          <button
            type="button"
            className={
              form.showApproxLocation
                ? `${styles.settingsSwitch} ${styles.settingsSwitchOn} ${styles.settingsSwitchInline}`
                : `${styles.settingsSwitch} ${styles.settingsSwitchInline}`
            }
            onClick={() => setField('showApproxLocation', !form.showApproxLocation)}
            role="switch"
            aria-checked={form.showApproxLocation}
            aria-label="Mostrar ubicación aproximada"
          >
            <span className={styles.settingsSwitchThumb} aria-hidden="true" />
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}
