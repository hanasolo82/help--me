import { getLocationLabel } from '../../../features/profile/utils/profileFormatters'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'
import HabitualLocationSearch from './HabitualLocationSearch'

export default function MapSettings() {
  const { form, profile, setField } = useSettings()
  const visibleZoneLabel = form.habitualLocationLabel || form.visibleZoneName || getLocationLabel(profile)

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
            <strong>{visibleZoneLabel}</strong>
            <p>La mostraremos de forma aproximada cuando tu disponibilidad esté activa.</p>
          </div>
        </div>

        <div className={styles.mapSwitchRow}>
          <div className={styles.mapToggleCopy}>
            <strong>Mostrar ubicación aproximada</strong>
            <p>Si lo desactivas, no aparecerás en el mapa público de helpers.</p>
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

        <HabitualLocationSearch form={form} setField={setField} />
      </div>
    </SettingsCard>
  )
}
