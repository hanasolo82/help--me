import { MAP_AVATAR_OPTIONS } from '../../../assets/map-avatars'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

function buildSlotList() {
  return MAP_AVATAR_OPTIONS.filter((slot) => Boolean(slot.url))
}

const RADIUS_OPTIONS = ['5', '10', '20', '50']

export default function MapSettings() {
  const { form, setField } = useSettings()
  const slots = buildSlotList()
  const selectedId = form.mapAvatarUrl || ''

  return (
    <SettingsCard
      id="mapa-ubicacion"
      eyebrow="Mapa"
      title="Mapa y ubicación"
      description="Define cómo se carga el mapa y cómo se muestra tu ubicación."
    >
      <div className={styles.grid}>
        <div className={styles.spanTwo}>
          <div className={styles.field}>
            <span>Tu avatar en el mapa</span>
            <div className={styles.mapAvatarGrid} role="radiogroup" aria-label="Avatar del mapa">
              {slots.map((slot) => {
                const isSelected = !slot.placeholder && slot.id === selectedId
                const className = [
                  styles.mapAvatarOption,
                  isSelected ? styles.mapAvatarOptionActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={className}
                    onClick={() => setField('mapAvatarUrl', slot.id)}
                    aria-pressed={isSelected}
                    title={slot.label}
                  >
                    <img src={slot.url} alt={`Avatar ${slot.label}`} />
                  </button>
                )
              })}
            </div>
            {selectedId && (
              <button
                type="button"
                className="link-button"
                onClick={() => setField('mapAvatarUrl', '')}
              >
                Quitar avatar del mapa
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <span>Preferencia inicial de búsqueda</span>
          <div className={styles.segmentedControlWide} role="radiogroup" aria-label="Preferencia inicial de búsqueda">
            {RADIUS_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={form.searchRadiusKm === value ? styles.segmentedActive : styles.segmentedButton}
                onClick={() => setField('searchRadiusKm', value)}
                aria-pressed={form.searchRadiusKm === value}
              >
                {value} km
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span>Mostrar ubicación aproximada</span>
          <button
            type="button"
            className={form.showApproxLocation ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={() => setField('showApproxLocation', !form.showApproxLocation)}
            aria-pressed={form.showApproxLocation}
          >
            <span>{form.showApproxLocation ? 'Sí' : 'No'}</span>
          </button>
          <p className={styles.helperText}>Mostraremos solo tu zona general, nunca una ubicación exacta.</p>
        </div>

      </div>
    </SettingsCard>
  )
}
