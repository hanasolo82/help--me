import { MAP_AVATAR_OPTIONS, MAP_AVATAR_SLOTS } from '../../../assets/map-avatars'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

// Rellena la cuadricula hasta MAP_AVATAR_SLOTS aunque aun no esten todas las imagenes.
function buildSlotList() {
  const slots = [...MAP_AVATAR_OPTIONS]
  while (slots.length < MAP_AVATAR_SLOTS) {
    slots.push({ id: `placeholder-${slots.length + 1}`, url: null, placeholder: true })
  }
  return slots
}

export default function MapSettings() {
  const { form, setField } = useSettings()
  const slots = buildSlotList()
  const selectedId = form.mapAvatarUrl || ''

  return (
    <SettingsCard
      eyebrow="Mapa"
      title="Visibilidad y alcance"
      description="Elige tu avatar del mapa entre las opciones disponibles y configura tu alcance."
    >
      <div className={styles.grid}>
        <div className={styles.spanTwo}>
          <div className={styles.field}>
            <span>Avatar del mapa</span>
            <div className={styles.mapAvatarGrid} role="radiogroup" aria-label="Avatar del mapa">
              {slots.map((slot) => {
                const isSelected = !slot.placeholder && slot.id === selectedId
                const className = [
                  styles.mapAvatarOption,
                  isSelected ? styles.mapAvatarOptionActive : '',
                  slot.placeholder ? styles.mapAvatarOptionPlaceholder : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={className}
                    onClick={() => !slot.placeholder && setField('mapAvatarUrl', slot.id)}
                    aria-pressed={isSelected}
                    disabled={slot.placeholder}
                    title={slot.placeholder ? 'Pendiente' : slot.label}
                  >
                    {slot.url
                      ? <img src={slot.url} alt={`Avatar ${slot.label}`} />
                      : <span aria-hidden="true">·</span>}
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

        <label className={styles.field}>
          <span>Radio de búsqueda en km</span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={form.searchRadiusKm}
            onChange={(event) => setField('searchRadiusKm', event.target.value)}
          />
        </label>

        <div className={styles.field}>
          <span>Disponible para ayudar</span>
          <button
            type="button"
            className={form.availabilityEnabled ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={() => setField('availabilityEnabled', !form.availabilityEnabled)}
            aria-pressed={form.availabilityEnabled}
          >
            <span>{form.availabilityEnabled ? 'Sí' : 'No'}</span>
          </button>
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
        </div>
      </div>
    </SettingsCard>
  )
}
